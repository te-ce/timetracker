import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-8 dark:bg-gray-900">
          <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 shadow dark:border-red-800 dark:bg-gray-800">
            <h1 className="mb-2 text-lg font-semibold text-red-700 dark:text-red-400">Something went wrong</h1>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Reload the page to continue. If the error persists, clear local storage.
            </p>
            <pre className="overflow-auto rounded bg-gray-100 p-3 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
              {this.state.error.message}
            </pre>
            <button
              className="mt-4 rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
