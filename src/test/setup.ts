// Test setup file - Common mocks for all tests
import { afterAll, beforeAll, expect, vi } from 'vitest'

;(globalThis as any).expect = expect

import '@testing-library/jest-dom/vitest'

// Mock Convex React hooks
vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useAction: vi.fn(),
  ConvexProvider: ({ children }: { children: React.ReactNode }) => children,
  ConvexReactClient: vi.fn(),
}))

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
  useSearchParams: () => [new URLSearchParams()],
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => {
    const a = document.createElement('a')
    a.href = to
    a.appendChild(typeof children === 'string' ? document.createTextNode(children) : children as Node)
    return a
  },
  Navigate: () => null,
  BrowserRouter: ({ children }: { children: React.ReactNode }) => {
    const div = document.createElement('div')
    div.appendChild(typeof children === 'string' ? document.createTextNode(children) : children as Node)
    return div
  },
  Routes: ({ children }: { children: React.ReactNode }) => {
    const div = document.createElement('div')
    div.appendChild(typeof children === 'string' ? document.createTextNode(children) : children as Node)
    return div
  },
  Route: () => null,
}))

global.SpeechSynthesis = vi.fn()
global.SpeechRecognition = vi.fn()
global.webkitSpeechRecognition = vi.fn()

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
}))

// Mock AudioContext
window.AudioContext = vi.fn(() => ({
  createAnalyser: vi.fn(() => ({
    fftSize: 256,
    frequencyBinCount: 128,
    getByteFrequencyData: vi.fn(),
  })),
  createMediaStreamDestination: vi.fn(),
  resume: vi.fn(),
})) as any

// Suppress console.error in tests unless needed
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (args[0]?.includes?.('Warning: ReactDOM.render is no longer supported')) return
    originalError.call(console, ...args)
  }
})
afterAll(() => {
  console.error = originalError
})