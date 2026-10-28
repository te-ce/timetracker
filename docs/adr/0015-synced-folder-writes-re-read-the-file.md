# ADR 0015: Synced-Folder Writes Re-Read the File First

## Status

Accepted. Extends [ADR 0013](0013-sync-queue-pending-writes-and-etag-conflicts.md) to storage without eTags.

## Context

In local-folder mode the data folder is usually synced by the OneDrive client. Another device can rewrite a month file at any time, and nothing reports it: the adapter has no eTag, so `StorageConflictError` is never thrown. The JSON stores applied each write to their cached copy, and the cache was dropped only when the window got focus. A write from the tray (which does not focus the window) therefore put back the old file and removed the other device's change. `months-index.json` is rewritten on every day update, so a month added on the other device could disappear from the index the same way.

## Decision

- `StorageAdapter` gets an optional `detectsConflicts` flag. `OneDriveStorageAdapter` and `FallbackStorageAdapter` set it.
- For an adapter without it, the store's `KeyWriter` drops the cache and reads the file again before each write, inside the per-key queue.
- Adapters with conflict detection keep the ADR 0013 behaviour: write on the cached copy, re-read only on a conflict.

## Consequences

- A change synced in from another device is kept when this device writes, for UI and tray writes and for the month index.
- Each write in local-folder mode costs one extra local file read.
- Two devices writing the same file within the OneDrive client's sync delay can still overwrite each other. Detecting that would need a modified-time check per write; not done.
