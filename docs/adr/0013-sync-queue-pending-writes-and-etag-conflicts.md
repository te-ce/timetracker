# ADR 0013: Pending Writes, Serialized Key Writes and eTag Conflict Detection

## Status

Accepted. Refines the caching strategy of [ADR 0005](0005-onedrive-app-folder-persistence.md).

## Context

ADR 0005 promised write-through caching with ETag conflict detection. The code did not deliver it:

- `FallbackStorageAdapter` swallowed a failed OneDrive write. The next read preferred the (stale) OneDrive copy, so offline edits were lost.
- When OneDrive returned 404, the adapter served the local copy. A month deleted on another device came back.
- `JsonRecordStore` / `JsonCollectionStore` / `JsonValueStore` updated their in-memory cache before the write and never re-read the file. Two overlapping `updateDay` calls could both read the same day and the second write dropped the first change. A slow PUT could land after a newer one.
- No eTag was sent, so two devices silently overwrote each other's month files.

## Decision

### 1. Pending keys in `FallbackStorageAdapter`

- Every write goes to the local fallback first, and the key is marked **pending**. The pending set is stored in the fallback (`sync-pending.json`), so it survives a restart.
- When OneDrive accepts the write, the key is no longer pending.
- While a key is pending, reads return the local copy and retry the upload. `flush()` retries all pending keys (on window focus, `online`, and from the header sync badge).
- For a key that is not pending, OneDrive is the truth. A 404 means "deleted" and the local copy is removed. A successful read is mirrored to the local copy.
- The pending count is reported to the UI. The header shows "unsynced" while it is above zero.

### 2. eTag / If-Match in `OneDriveStorageAdapter`

- `get` reads the item metadata (`eTag`, `@microsoft.graph.downloadUrl`) and then downloads the content. The number of requests is the same as before, because `/content` answered with a 302 to the same download URL.
- `put` / `delete` send `If-Match: <last seen eTag>`. A `put` without a known eTag (the file was seen as missing, or its read failed) uses `@microsoft.graph.conflictBehavior=fail`, so it never overwrites a file this device has not read.
- A 412 or 409 response throws `StorageConflictError`.

### 3. Serialized, conflict-retried writes in the JSON stores

- All writes to one key run one after another (per-store promise queue): read (from cache) → mutate → put.
- The cache takes the new value only after the put succeeds. A failed write leaves the cache unchanged.
- On `StorageConflictError` the store drops its cache, re-reads the file and re-applies the same mutation (max. 3 attempts). Because a mutation changes one day (or one record), changes from other devices to other days are kept.
- `CloudMonthRepository.updateDay` is one read-modify-write on the store, not a separate get and set.

### 4. Conflicts while replaying offline writes

A pending key only has the full local file, not the mutation that produced it. If OneDrive reports a conflict during replay, the local version wins (last write wins) and a warning is logged. This is the "last-write-wins with warning" of ADR 0005, now limited to offline edits.

## Consequences

- Offline edits are kept and uploaded later; the user sees an "unsynced" badge until then.
- Deletes on one device are no longer undone by another device's local copy.
- Concurrent edits on two online devices merge at day level instead of overwriting the whole month.
- A month edited offline on one device and online on another still loses the online changes to that month file when the offline device comes back (logged as a warning).
- Writes are slower when several are queued for the same key, because they no longer run in parallel.
