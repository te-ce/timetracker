import { render, screen, fireEvent } from '@testing-library/react'
import { Tooltip } from './Tooltip'

describe('Tooltip', () => {
  describe('visibility', () => {
    it('does not show tooltip content initially', () => {
      render(
        <Tooltip content="Hello">
          <button>trigger</button>
        </Tooltip>,
      )

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })

    it('shows tooltip content on mouseenter', () => {
      render(
        <Tooltip content="Hello">
          <button>trigger</button>
        </Tooltip>,
      )

      fireEvent.mouseEnter(screen.getByRole('button'))
      expect(screen.getByRole('tooltip')).toBeInTheDocument()
      expect(screen.getByRole('tooltip')).toHaveTextContent('Hello')
    })

    it('hides tooltip content on mouseleave', () => {
      render(
        <Tooltip content="Hello">
          <button>trigger</button>
        </Tooltip>,
      )

      const trigger = screen.getByRole('button')
      fireEvent.mouseEnter(trigger)
      fireEvent.mouseLeave(trigger)
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })

    it('shows tooltip content on focus', () => {
      render(
        <Tooltip content="Hello">
          <button>trigger</button>
        </Tooltip>,
      )

      fireEvent.focus(screen.getByRole('button'))
      expect(screen.getByRole('tooltip')).toBeInTheDocument()
    })

    it('hides tooltip content on blur', () => {
      render(
        <Tooltip content="Hello">
          <button>trigger</button>
        </Tooltip>,
      )

      const trigger = screen.getByRole('button')
      fireEvent.focus(trigger)
      fireEvent.blur(trigger)
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })
  })

  describe('content guard', () => {
    it('renders nothing when content is undefined', () => {
      render(
        <Tooltip content={undefined}>
          <button>trigger</button>
        </Tooltip>,
      )

      fireEvent.mouseEnter(screen.getByRole('button'))
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })

    it('renders nothing when content is empty string', () => {
      render(
        <Tooltip content="">
          <button>trigger</button>
        </Tooltip>,
      )

      fireEvent.mouseEnter(screen.getByRole('button'))
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })

    it('renders nothing when content is null', () => {
      render(
        <Tooltip content={null}>
          <button>trigger</button>
        </Tooltip>,
      )

      fireEvent.mouseEnter(screen.getByRole('button'))
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })

    it('renders ReactNode content (JSX)', () => {
      render(
        <Tooltip content={<strong>Rich</strong>}>
          <button>trigger</button>
        </Tooltip>,
      )

      fireEvent.mouseEnter(screen.getByRole('button'))
      expect(document.body.querySelector('strong')).toBeInTheDocument()
    })
  })

  describe('portal target', () => {
    it('renders tooltip bubble as a direct child of document.body', () => {
      render(
        <Tooltip content="Portal test">
          <button>trigger</button>
        </Tooltip>,
      )

      fireEvent.mouseEnter(screen.getByRole('button'))
      const tooltip = screen.getByRole('tooltip')
      expect(tooltip.parentElement).toBe(document.body)
    })
  })

  describe('placement prop', () => {
    it('defaults to top placement without error', () => {
      render(
        <Tooltip content="No placement prop">
          <button>trigger</button>
        </Tooltip>,
      )

      fireEvent.mouseEnter(screen.getByRole('button'))
      expect(screen.getByRole('tooltip')).toBeInTheDocument()
    })

    it('accepts bottom placement without error', () => {
      render(
        <Tooltip content="Bottom" placement="bottom">
          <button>trigger</button>
        </Tooltip>,
      )

      fireEvent.mouseEnter(screen.getByRole('button'))
      expect(screen.getByRole('tooltip')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('tooltip element has role="tooltip"', () => {
      render(
        <Tooltip content="A11y">
          <button>trigger</button>
        </Tooltip>,
      )

      fireEvent.mouseEnter(screen.getByRole('button'))
      expect(screen.getByRole('tooltip')).toBeInTheDocument()
    })

    it('trigger has aria-describedby pointing to tooltip id while visible', () => {
      render(
        <Tooltip content="Describe me">
          <button>trigger</button>
        </Tooltip>,
      )

      const trigger = screen.getByRole('button')
      fireEvent.mouseEnter(trigger)
      const tooltip = screen.getByRole('tooltip')
      expect(trigger).toHaveAttribute('aria-describedby', tooltip.id)
    })

    it('trigger loses aria-describedby when hidden', () => {
      render(
        <Tooltip content="Describe me">
          <button>trigger</button>
        </Tooltip>,
      )

      const trigger = screen.getByRole('button')
      fireEvent.mouseEnter(trigger)
      fireEvent.mouseLeave(trigger)
      expect(trigger).not.toHaveAttribute('aria-describedby')
    })
  })

  describe('styling', () => {
    it('tooltip bubble has bg-gray-800 class', () => {
      render(
        <Tooltip content="Styled">
          <button>trigger</button>
        </Tooltip>,
      )

      fireEvent.mouseEnter(screen.getByRole('button'))
      expect(screen.getByRole('tooltip').className).toContain('bg-gray-800')
    })

    it('tooltip bubble has text-white and text-xs classes', () => {
      render(
        <Tooltip content="Styled">
          <button>trigger</button>
        </Tooltip>,
      )

      fireEvent.mouseEnter(screen.getByRole('button'))
      const tooltip = screen.getByRole('tooltip')
      expect(tooltip.className).toContain('text-white')
      expect(tooltip.className).toContain('text-xs')
    })
  })
})
