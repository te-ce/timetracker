import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AutoCategoryRow } from './AutoCategoryRow'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('AutoCategoryRow', () => {
  it('shows calculated auto hours for the configured category', () => {
    render(
      <AutoCategoryRow autoCategory="_COREMEDIA" workedHours={8} manualTotal={5} />,
      { wrapper },
    )
    expect(screen.getByText('_COREMEDIA')).toBeInTheDocument()
    expect(screen.getByText('3h')).toBeInTheDocument()
    expect(screen.getByLabelText(/auto/i)).toBeInTheDocument()
  })

  it('shows 0h and overbooking warning when manual exceeds worked', () => {
    render(
      <AutoCategoryRow autoCategory="_SUPPORT" workedHours={6} manualTotal={9} />,
      { wrapper },
    )
    expect(screen.getByText('0h')).toBeInTheDocument()
    expect(screen.getByText(/overbooking/i)).toBeInTheDocument()
  })

  it('renders nothing when autoCategory is null', () => {
    const { container } = render(
      <AutoCategoryRow autoCategory={null} workedHours={8} manualTotal={3} />,
      { wrapper },
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows exactly 0h when manual equals worked', () => {
    render(
      <AutoCategoryRow autoCategory="_INFRA" workedHours={8} manualTotal={8} />,
      { wrapper },
    )
    expect(screen.getByText('0h')).toBeInTheDocument()
    expect(screen.queryByText(/overbooking/i)).not.toBeInTheDocument()
  })
})
