import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ErrorBanner, ErrorPanel, installGlobalErrorReporter } from '../ErrorBanner'
import { ErrorBoundary } from '../ErrorBoundary'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ErrorBanner', () => {
  it('renders runtime errors with a dismiss action', () => {
    render(
      <ErrorBanner
        errors={[{ id: 'error-1', message: 'ComfyUI is offline', source: 'http://localhost:5174/src/lib/comfyAvatar.ts' }]}
        onDismiss={vi.fn()}
      />,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('ComfyUI is offline')).toBeInTheDocument()
    expect(screen.getByText(/Source: http:\/\/localhost:5174\/src\/lib\/comfyAvatar.ts/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dismiss error' })).toBeInTheDocument()
  })

  it('dismisses errors when requested', () => {
    const onDismiss = vi.fn()

    render(
      <ErrorBanner
        errors={[{ id: 'error-1', message: 'ComfyUI is offline' }]}
        onDismiss={onDismiss}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss error' }))
    expect(onDismiss).toHaveBeenCalledWith('error-1')
  })

  it('renders a simple error panel', () => {
    render(<ErrorPanel>Character creation failed</ErrorPanel>)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Character creation failed')).toBeInTheDocument()
  })
})

describe('ErrorBoundary', () => {
  it('shows a visible fallback when a child component throws', () => {
    // Suppress the expected React error boundary console output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    function BrokenPage(): never {
      throw new Error('Quest could not load')
    }

    render(
      <ErrorBoundary>
        <BrokenPage />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Quest could not load')).toBeInTheDocument()

    consoleSpy.mockRestore()
  })
})

describe('installGlobalErrorReporter', () => {
  it('reports unhandled promise rejections to the app banner callback', () => {
    const onError = vi.fn()
    const event = new Event('unhandledrejection') as Event & { reason: Error }
    event.reason = new Error('Avatar generation failed')

    installGlobalErrorReporter(onError)
    window.dispatchEvent(event)

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Unhandled promise rejection: Avatar generation failed',
    }))
  })
})
