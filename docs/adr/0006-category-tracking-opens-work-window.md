# Category tracking start/stop automatically manages open WorkWindows

When the user starts category tracking in DayView, the app automatically opens a WorkWindow for that day (start = current local time, end = null) unless one is already open. When tracking stops, the latest open WorkWindow for that day is closed (end = current local time). This couples the two systems intentionally.

The alternative was to keep them fully independent — the user manually creates WorkWindows and separately tracks category time. We rejected this because it requires two explicit actions for what is conceptually one event ("I started working"), and leaves WorkedHours inaccurate during an active session.

## Consequences

- `WorkWindow.end` is now nullable (`string | null`). Open WorkWindows contribute a live `now − start` duration to WorkedHours (1-minute tick in DayView).
- If multiple open WorkWindows exist for a day, stop closes the one with the latest start time.
- Category tracking for a past day creates a WorkWindow on that past date, not today.
