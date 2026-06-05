import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useUndoStore } from './undoStore'

function getStore() {
  return useUndoStore.getState()
}

beforeEach(() => {
  useUndoStore.setState({ past: [], future: [], canUndo: false, canRedo: false })
})

describe('undoStore', () => {
  describe('push', () => {
    it('adds a command and sets canUndo', () => {
      const cmd = { description: 'test', undo: vi.fn(), redo: vi.fn() }
      getStore().push(cmd)
      const { past, future, canUndo, canRedo } = getStore()
      expect(past).toHaveLength(1)
      expect(past[0]).toBe(cmd)
      expect(future).toHaveLength(0)
      expect(canUndo).toBe(true)
      expect(canRedo).toBe(false)
    })

    it('clears the future stack when a new command is pushed', () => {
      const cmd1 = { description: 'a', undo: vi.fn(), redo: vi.fn() }
      const cmd2 = { description: 'b', undo: vi.fn(), redo: vi.fn() }
      getStore().push(cmd1)
      // Simulate having a future (undo then push new)
      useUndoStore.setState({ future: [cmd2], canRedo: true })
      const cmd3 = { description: 'c', undo: vi.fn(), redo: vi.fn() }
      getStore().push(cmd3)
      expect(getStore().future).toHaveLength(0)
      expect(getStore().canRedo).toBe(false)
    })

    it('caps the past stack at MAX_STACK (50)', () => {
      for (let i = 0; i < 55; i++) {
        getStore().push({ description: `cmd-${i}`, undo: vi.fn(), redo: vi.fn() })
      }
      expect(getStore().past).toHaveLength(50)
    })
  })

  describe('undo', () => {
    it('does nothing when past is empty', async () => {
      await getStore().undo()
      expect(getStore().past).toHaveLength(0)
      expect(getStore().future).toHaveLength(0)
    })

    it('moves the last command from past to future and calls undo()', async () => {
      const undoFn = vi.fn().mockResolvedValue(undefined)
      const cmd = { description: 'test', undo: undoFn, redo: vi.fn() }
      getStore().push(cmd)
      await getStore().undo()
      expect(undoFn).toHaveBeenCalledOnce()
      const { past, future, canUndo, canRedo } = getStore()
      expect(past).toHaveLength(0)
      expect(future).toHaveLength(1)
      expect(future[0]).toBe(cmd)
      expect(canUndo).toBe(false)
      expect(canRedo).toBe(true)
    })

    it('keeps canUndo true when more items remain in past', async () => {
      const cmd1 = { description: 'a', undo: vi.fn(), redo: vi.fn() }
      const cmd2 = { description: 'b', undo: vi.fn(), redo: vi.fn() }
      getStore().push(cmd1)
      getStore().push(cmd2)
      await getStore().undo()
      expect(getStore().canUndo).toBe(true)
    })

    it('awaits synchronous undo functions', async () => {
      const undoFn = vi.fn()
      const cmd = { description: 'sync', undo: undoFn, redo: vi.fn() }
      getStore().push(cmd)
      await getStore().undo()
      expect(undoFn).toHaveBeenCalledOnce()
    })
  })

  describe('redo', () => {
    it('does nothing when future is empty', async () => {
      await getStore().redo()
      expect(getStore().past).toHaveLength(0)
    })

    it('moves the first command from future to past and calls redo()', async () => {
      const redoFn = vi.fn().mockResolvedValue(undefined)
      const cmd = { description: 'test', undo: vi.fn(), redo: redoFn }
      getStore().push(cmd)
      await getStore().undo()
      await getStore().redo()
      expect(redoFn).toHaveBeenCalledOnce()
      const { past, future, canUndo, canRedo } = getStore()
      expect(past).toHaveLength(1)
      expect(future).toHaveLength(0)
      expect(canUndo).toBe(true)
      expect(canRedo).toBe(false)
    })

    it('keeps canRedo true when more items remain in future', async () => {
      const cmd1 = { description: 'a', undo: vi.fn(), redo: vi.fn() }
      const cmd2 = { description: 'b', undo: vi.fn(), redo: vi.fn() }
      getStore().push(cmd1)
      getStore().push(cmd2)
      await getStore().undo()
      await getStore().undo()
      await getStore().redo()
      expect(getStore().canRedo).toBe(true)
    })
  })

  describe('undo failure safety', () => {
    it('does not move command to future when undo throws', async () => {
      const cmd = {
        description: 'failing',
        undo: vi.fn().mockRejectedValue(new Error('network error')),
        redo: vi.fn(),
      }
      getStore().push(cmd)

      await expect(getStore().undo()).rejects.toThrow('network error')

      const { past, future, canUndo, canRedo } = getStore()
      expect(past).toHaveLength(1)
      expect(past[0]).toBe(cmd)
      expect(future).toHaveLength(0)
      expect(canUndo).toBe(true)
      expect(canRedo).toBe(false)
    })

    it('does not move command to past when redo throws', async () => {
      const cmd = {
        description: 'failing',
        undo: vi.fn(),
        redo: vi.fn().mockRejectedValue(new Error('network error')),
      }
      getStore().push(cmd)
      await getStore().undo()

      await expect(getStore().redo()).rejects.toThrow('network error')

      const { past, future, canUndo, canRedo } = getStore()
      expect(past).toHaveLength(0)
      expect(future).toHaveLength(1)
      expect(future[0]).toBe(cmd)
      expect(canUndo).toBe(false)
      expect(canRedo).toBe(true)
    })
  })

  describe('undo / redo round-trip', () => {
    it('full undo then redo sequence restores state correctly', async () => {
      const log: string[] = []
      const cmd1 = {
        description: 'first',
        undo: vi.fn(() => {
          log.push('undo-1')
        }),
        redo: vi.fn(() => {
          log.push('redo-1')
        }),
      }
      const cmd2 = {
        description: 'second',
        undo: vi.fn(() => {
          log.push('undo-2')
        }),
        redo: vi.fn(() => {
          log.push('redo-2')
        }),
      }
      getStore().push(cmd1)
      getStore().push(cmd2)
      await getStore().undo()
      await getStore().undo()
      await getStore().redo()
      await getStore().redo()
      expect(log).toEqual(['undo-2', 'undo-1', 'redo-1', 'redo-2'])
      expect(getStore().canUndo).toBe(true)
      expect(getStore().canRedo).toBe(false)
    })
  })
})
