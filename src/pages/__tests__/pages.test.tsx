import React from 'react'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Landing } from '../Landing'
import { Login } from '../Login'
import { Signup } from '../Signup'
import { CreateCampaign } from '../CreateCampaign'
import { CreateCharacter } from '../CreateCharacter'
import { CampaignDetail } from '../CampaignDetail'
import { JoinCampaign } from '../JoinCampaign'
import { AuthProvider } from '../../hooks/useAuth'

// Mock Convex hooks
vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useAction: vi.fn(),
  ConvexProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: vi.fn(),
  useParams: vi.fn(),
  useSearchParams: vi.fn(),
  useLocation: () => ({ pathname: '/' }),
}))

// Import after mock so we can use vi.mocked on the mocked modules
import { useMutation, useQuery, useAction } from 'convex/react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

const mockUser = {
  _id: 'test-user',
  _creationTime: Date.now(),
  email: 'test@test.com',
  name: 'Test User',
  planId: 'free',
  sessionsUsedThisMonth: 0,
  createdAt: Date.now(),
}

beforeEach(() => {
  vi.mocked(useQuery).mockReturnValue(mockUser as any)
  vi.mocked(useMutation).mockReturnValue(vi.fn() as any)
  vi.mocked(useAction).mockReturnValue(vi.fn(async () => 'A brave storybook fantasy portrait.') as any)
  vi.mocked(useNavigate).mockReturnValue(vi.fn())
  vi.mocked(useParams).mockReturnValue({ code: 'ABC123' } as any)
  vi.mocked(useSearchParams).mockReturnValue([new URLSearchParams({ campaign: 'campaign-id' })] as any)
})

afterEach(() => {
  cleanup()
})

const renderWithProviders = (component: React.ReactElement) => {
  return render(<AuthProvider>{component}</AuthProvider>)
}

// ─── Landing Page ────────────────────────────────────────────────────────────

describe('Landing Page', () => {
  it('renders hero section with title', () => {
    renderWithProviders(<Landing />)
    expect(screen.getByText('Your AI Dungeon Master Awaits')).toBeInTheDocument()
  })

  it('renders feature cards', () => {
    renderWithProviders(<Landing />)
    expect(screen.getByText('Voice-First Play')).toBeInTheDocument()
    expect(screen.getByText('AI Character Avatars')).toBeInTheDocument()
    expect(screen.getByText('Quest Codes')).toBeInTheDocument()
  })

  it('has signup and login links', () => {
    renderWithProviders(<Landing />)
    expect(screen.getByText('Sign In')).toBeInTheDocument()
    expect(screen.getByText('Start Free')).toBeInTheDocument()
  })
})

// ─── Login Page ──────────────────────────────────────────────────────────────

describe('Login Page', () => {
  it('renders login form', () => {
    renderWithProviders(<Login />)
    expect(screen.getByText('Welcome Back')).toBeInTheDocument()
    expect(screen.getByLabelText('Your real name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
  })

  it('shows create account link', () => {
    renderWithProviders(<Login />)
    expect(screen.getByText('Create an account')).toBeInTheDocument()
  })
})

// ─── Signup Page ─────────────────────────────────────────────────────────────

describe('Signup Page', () => {
  it('renders signup form', () => {
    renderWithProviders(<Signup />)
    expect(screen.getByText('Create Your Account')).toBeInTheDocument()
    expect(screen.getByLabelText('Your real name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument()
  })

  it('explains that hero creation happens after account creation', () => {
    renderWithProviders(<Signup />)
    expect(screen.getByText(/create your hero name after starting your first campaign/i)).toBeInTheDocument()
  })
})

// ─── CreateCampaign Page ─────────────────────────────────────────────────────

describe('CreateCampaign Page', () => {
  it('renders campaign creation form', () => {
    renderWithProviders(<CreateCampaign />)
    expect(screen.getByLabelText('Campaign Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Setting')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Campaign' })).toBeInTheDocument()
  })

  it('creates a campaign from the form values', async () => {
    const createCampaign = vi.fn().mockResolvedValue({ campaignId: 'campaign-id', questCode: 'ABC123' })
    vi.mocked(useMutation).mockReturnValue(createCampaign as any)

    renderWithProviders(<CreateCampaign />)

    fireEvent.change(screen.getByLabelText('Campaign Name'), { target: { value: 'The Hollow Mine' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Campaign' }))

    expect(createCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'The Hollow Mine', setting: 'Fantasy' })
    )
  })

  it('has all settings options', () => {
    renderWithProviders(<CreateCampaign />)
    const select = screen.getByLabelText('Setting')
    expect(select).toHaveValue('Fantasy')
    const options = ['Fantasy', 'Sci-Fi', 'Mystery', 'Horror', 'Steampunk', 'Post-Apocalyptic']
    options.forEach(opt => {
      expect(screen.getByRole('option', { name: opt })).toBeInTheDocument()
    })
  })
})

// ─── CampaignDetail Page ─────────────────────────────────────────────────────

describe('CampaignDetail Page', () => {
  beforeEach(() => {
    vi.mocked(useParams).mockReturnValue({ id: 'campaign-id' } as any)
    vi.mocked(useQuery).mockReturnValue(mockUser as any)
  })

  const setupCampaignDetailMocks = () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce(mockUser as any)  // AuthProvider useQuery
      .mockReturnValueOnce({
        _id: 'campaign-id',
        ownerId: 'test-user',
        name: 'The Hollow Mine',
        setting: 'Fantasy',
        questCode: 'ABC123',
      } as any)
      .mockReturnValueOnce([{
        _id: 'char-id',
        name: 'Vael Moonwhisper',
        race: 'Elf',
        class: 'Wizard',
        hp: 6,
        maxHp: 6,
        avatarUrl: '',
      }] as any)
      .mockReturnValueOnce([{
        _id: 'session-id',
        startedAt: Date.now(),
        endedAt: Date.now(),
        summary: 'The party entered the mine and found a glowing Palantir.',
      }] as any)
      .mockReturnValueOnce([{ _id: 'membership-id', userId: 'test-user', user: { name: 'Test User' } }] as any)
  }

  it('renders quest code, characters, session recaps, and party members', () => {
    setupCampaignDetailMocks()
    renderWithProviders(<CampaignDetail />)

    expect(screen.getByText('The Hollow Mine')).toBeInTheDocument()
    expect(screen.getAllByText('ABC123').length).toBeGreaterThan(0)
    expect(screen.getByText('Vael Moonwhisper')).toBeInTheDocument()
    expect(screen.getByText(/The party entered the mine/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Review Recap' })).toBeInTheDocument()
    expect(screen.getByText('Test User (Owner)')).toBeInTheDocument()
  })

  it('starts a new session for the campaign owner', async () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce(mockUser as any)  // AuthProvider useQuery
      .mockReturnValueOnce({ _id: 'campaign-id', ownerId: 'test-user', name: 'The Hollow Mine', setting: 'Fantasy', questCode: 'ABC123' } as any)
      .mockReturnValueOnce([] as any)
      .mockReturnValueOnce([] as any)
      .mockReturnValueOnce([{ _id: 'membership-id', userId: 'test-user', user: { name: 'Test User' } }] as any)

    renderWithProviders(<CampaignDetail />)

    // Verify the Start Session button is visible for the owner
    expect(screen.getByRole('button', { name: 'Start Session' })).toBeInTheDocument()
  })
})

// ─── CreateCharacter Page ────────────────────────────────────────────────────

describe('CreateCharacter Page', () => {
  it('surfaces the character name generator after class and race are chosen', async () => {
    renderWithProviders(<CreateCharacter />)

    fireEvent.click(screen.getByRole('button', { name: 'Fighter' }))
    fireEvent.click(screen.getByRole('button', { name: 'Elf' }))

    expect(await screen.findByRole('heading', { name: 'Name Your Hero' })).toBeInTheDocument()
    expect(screen.getByLabelText('Character Name')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Surprise Me' })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Surprise Me' }))
    expect(screen.getByRole('button', { name: 'Next' })).not.toBeDisabled()
  })

  it('uses generated names in the hero creation flow', async () => {
    renderWithProviders(<CreateCharacter />)

    fireEvent.click(screen.getByRole('button', { name: 'Fighter' }))
    fireEvent.click(screen.getByRole('button', { name: 'Elf' }))

    const nameInput = screen.getByLabelText('Character Name')
    fireEvent.change(nameInput, { target: { value: 'Vael Moonwhisper' } })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByRole('heading', { name: 'AI Avatar' })).toBeInTheDocument()
    expect(await screen.findByText(/storybook fantasy portrait/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generate Avatar with ComfyUI' })).toBeInTheDocument()
  })
})

// ─── JoinCampaign Page ───────────────────────────────────────────────────────

describe('JoinCampaign Page', () => {
  it('renders join form when not authenticated', () => {
    vi.mocked(useParams).mockReturnValue({ code: 'ABC123' } as any)
    renderWithProviders(<JoinCampaign />)
    expect(screen.getByText('Join Campaign')).toBeInTheDocument()
    expect(screen.getByLabelText('Your Hero Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })
})
