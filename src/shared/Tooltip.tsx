import { useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import React from 'react'

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>
  placement?: 'top' | 'bottom'
}

interface Coords {
  top: number
  left: number
}

export function Tooltip({ content, children, placement = 'top' }: TooltipProps) {
  const id = useId()
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState<Coords>({ top: 0, left: 0 })

  const isEmpty = content === null || content === undefined || content === ''
  if (isEmpty) return children

  function show() {
    const el = wrapperRef.current?.firstElementChild
    if (!el) return
    const rect = el.getBoundingClientRect()
    const top = placement === 'bottom' ? rect.bottom + window.scrollY + 6 : rect.top + window.scrollY - 6
    setCoords({ top, left: rect.left + window.scrollX + rect.width / 2 })
    setVisible(true)
  }

  function hide() {
    setVisible(false)
  }

  const cloned = visible ? React.cloneElement(children, { 'aria-describedby': id }) : children

  const transformY = placement === 'bottom' ? '0' : '-100%'

  return (
    <>
      <span
        ref={wrapperRef}
        style={{ display: 'contents' }}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {cloned}
      </span>
      {visible &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              transform: `translateX(-50%) translateY(${transformY})`,
            }}
            className="bg-gray-800 dark:bg-gray-700 text-white text-xs rounded px-2.5 py-1.5 shadow-lg pointer-events-none max-w-52 break-words z-[9999]"
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  )
}
