import { useEffect, type RefObject } from 'react'

export function useCloseOnOutsideClickOrEscape(
  active: boolean,
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
  options: { escapeKey?: boolean } = {},
): void {
  const { escapeKey = false } = options

  useEffect(() => {
    if (!active) return

    function handleClick(e: MouseEvent) {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) {
        onClose()
      }
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handleClick)
    if (escapeKey) document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      if (escapeKey) document.removeEventListener('keydown', handleKey)
    }
  }, [active, ref, onClose, escapeKey])
}
