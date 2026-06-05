import { create } from 'zustand'

interface UndoCommand {
  description: string
  undo: () => Promise<void> | void
  redo: () => Promise<void> | void
}

const MAX_STACK = 50

interface UndoState {
  past: UndoCommand[]
  future: UndoCommand[]
  push: (cmd: UndoCommand) => void
  undo: () => Promise<void>
  redo: () => Promise<void>
  canUndo: boolean
  canRedo: boolean
}

export const useUndoStore = create<UndoState>()((set, get) => ({
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  push(cmd) {
    set((s) => {
      const past = [...s.past, cmd].slice(-MAX_STACK)
      return { past, future: [], canUndo: true, canRedo: false }
    })
  },

  async undo() {
    const { past } = get()
    if (past.length === 0) return
    const cmd = past[past.length - 1]
    if (!cmd) return
    await cmd.undo()
    set((s) => {
      const next = s.past.slice(0, -1)
      const future: UndoCommand[] = [cmd, ...s.future]
      return {
        past: next,
        future,
        canUndo: next.length > 0,
        canRedo: true,
      }
    })
  },

  async redo() {
    const { future } = get()
    if (future.length === 0) return
    const cmd = future[0]
    if (!cmd) return
    await cmd.redo()
    set((s) => {
      const next = s.future.slice(1)
      const newPast: UndoCommand[] = [...s.past, cmd]
      return {
        past: newPast,
        future: next,
        canUndo: true,
        canRedo: next.length > 0,
      }
    })
  },
}))
