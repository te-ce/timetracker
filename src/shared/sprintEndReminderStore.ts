import { create } from 'zustand'

export const useSprintEndReminderStore = create<{ requested: boolean }>(() => ({ requested: false }))

// Fired wherever the user stops work; the app-level dialog decides whether a reminder is due.
export function requestSprintEndReminder(): void {
  useSprintEndReminderStore.setState({ requested: true })
}
