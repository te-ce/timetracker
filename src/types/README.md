# src/types

Ambient TypeScript declarations for browser APIs not in TypeScript's DOM lib.

## Rule

Never cast `window` to extend it at call sites (`window as Window & { foo: Fn }`). Extend `Window` here instead.

## `file-system-access.d.ts`

Adds type coverage for the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API):

```typescript
interface FileSystemHandle {
  queryPermission(descriptor: { mode: 'read' | 'readwrite' }): Promise<PermissionState>
  requestPermission(descriptor: { mode: 'read' | 'readwrite' }): Promise<PermissionState>
}

interface Window {
  showDirectoryPicker?(options?: { mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>
}
```

`showDirectoryPicker` is optional (`?`) because it is not available in all browsers. Guard with `if (!window.showDirectoryPicker)` before calling.
