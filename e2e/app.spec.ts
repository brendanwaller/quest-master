import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Dragon MAIster/)
  })

  test('shows hero section with title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Your AI Dungeon Master Awaits')
  })

  test('shows feature cards', async ({ page }) => {
    await expect(page.locator('text=Voice-First Play')).toBeVisible()
    await expect(page.locator('text=AI Character Avatars')).toBeVisible()
    await expect(page.locator('text=Quest Codes')).toBeVisible()
  })

  test('navigates to signup', async ({ page }) => {
    await page.click('text=Start Free')
    await expect(page).toHaveURL(/.*signup/)
    await expect(page.locator('h1')).toContainText('Create Your Account')
  })

  test('navigates to login', async ({ page }) => {
    await page.click('text=Sign In')
    await expect(page).toHaveURL(/.*login/)
    await expect(page.locator('h1')).toContainText('Welcome Back')
  })
})

test.describe('Authentication Flow', () => {
  test('signup creates account and redirects to dashboard', async ({ page }) => {
    await page.goto('/signup')
    await page.fill('input[id="name"]', 'Test Hero')
    await page.fill('input[id="email"]', 'test@test.com')
    await page.click('button:has-text("Create Account")')
    await expect(page).toHaveURL(/.*dashboard/)
    await expect(page.locator('h1')).toContainText('Welcome back, Test Hero')
  })

  test('login redirects to dashboard', async ({ page }) => {
    // First signup
    await page.goto('/signup')
    await page.fill('input[id="name"]', 'Test Hero')
    await page.fill('input[id="email"]', 'test@test.com')
    await page.click('button:has-text("Create Account")')
    await expect(page).toHaveURL(/.*dashboard/)

    // Logout
    await page.click('text=Sign Out')
    await expect(page).toHaveURL(/.*login/)

    // Login again
    await page.fill('input[id="name"]', 'Test Hero')
    await page.fill('input[id="email"]', 'test@test.com')
    await page.click('text=Sign In')
    await expect(page).toHaveURL(/.*dashboard/)
  })
})

test.describe('Campaign Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/signup')
    await page.fill('input[id="name"]', 'Test Hero')
    await page.fill('input[id="email"]', 'test@test.com')
    await page.click('button:has-text("Create Account")')
    await expect(page).toHaveURL(/.*dashboard/)
  })

  test('creates a campaign', async ({ page }) => {
    await page.click('text=+ New Campaign')
    await expect(page).toHaveURL(/.*campaigns\/new/)

    await page.fill('input[name="name"]', 'My Adventure')
    await page.selectOption('select[name="setting"]', 'Fantasy')
    await page.click('button:has-text("Create Campaign")')

    await expect(page).toHaveURL(/.*campaigns\//)
    await expect(page.locator('h1')).toContainText('My Adventure')
  })

  test('shows campaign detail with quest code', async ({ page }) => {
    // Create campaign
    await page.click('text=+ New Campaign')
    await page.fill('input[name="name"]', 'Quest Campaign')
    await page.selectOption('select[name="setting"]', 'Mystery')
    await page.click('button:has-text("Create Campaign")')

    // Check quest code is displayed
    await expect(page.locator('text=Quest Code')).toBeVisible()
    const questCode = await page.locator('.quest-code-display code').first().textContent()
    expect(questCode).toMatch(/^[A-Z0-9]{6}$/)
  })

  test('creates character via wizard', async ({ page }) => {
    // Create campaign first
    await page.click('text=+ New Campaign')
    await page.fill('input[name="name"]', 'Char Campaign')
    await page.selectOption('select[name="setting"]', 'Fantasy')
    await page.click('button:has-text("Create Campaign")')

    // Create character
    await page.click('text=+ Add Character')
    await expect(page).toHaveURL(/.*characters\/new/)

    // Step 1: Class
    await page.click('text=Fighter')
    // Should auto-advance to step 2

    // Step 2: Race
    await page.click('text=Human')

    // Step 3: Name
    await page.fill('input[id="name"]', 'Sir Gallant')
    await page.click('button:has-text("Next")')

    // Step 4: Avatar
    await page.click('button:has-text("Regenerate")')
    await expect(page.locator('.avatar-desc')).toBeVisible()
    await page.click('button:has-text("Next")')

    // Step 5: Starter Item
    await page.click('text=Rusty Sword')
    // Should submit

    await expect(page).toHaveURL(/.*campaigns\//)
    await expect(page.locator('text=Sir Gallant')).toBeVisible()
  })
})

test.describe('Join Flow', () => {
  test('allows joining via quest code', async ({ page }) => {
    // Create campaign and get quest code
    await page.goto('/signup')
    await page.fill('input[id="name"]', 'Owner')
    await page.fill('input[id="email"]', 'owner@test.com')
    await page.click('button:has-text("Create Account")')

    await page.click('text=+ New Campaign')
    await page.fill('input[name="name"]', 'Joinable Campaign')
    await page.click('button:has-text("Create Campaign")')

    const questCode = await page.locator('.quest-code-display code').first().textContent()
    expect(questCode).toMatch(/^[A-Z0-9]{6}$/)

    // Logout
    await page.click('text=Sign Out')
    await expect(page).toHaveURL(/.*login/)

    // Join via quest code in new context
    const page2 = await page.context().newPage()
    await page2.goto(`/join/${questCode}`)

    await page2.fill('input[id="name"]', 'Player Two')
    await page2.fill('input[id="email"]', 'player2@test.com')
    await page2.click('button:has-text("Continue")')

    await expect(page2.locator('text=Join Campaign')).toBeVisible()
    await page2.click('button:has-text("Join Campaign")')

    await expect(page2).toHaveURL(/.*campaigns\//)
    await expect(page2.locator('h1')).toContainText('Joinable Campaign')
  })
})

test.describe('Session Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup')
    await page.fill('input[id="name"]', 'Test Hero')
    await page.fill('input[id="email"]', 'test@test.com')
    await page.click('button:has-text("Create Account")')

    await page.click('text=+ New Campaign')
    await page.fill('input[name="name"]', 'Session Campaign')
    await page.click('button:has-text("Create Campaign")')

    await page.click('button:has-text("Start Session")')
  })

  test('loads session page with Palantir orb', async ({ page }) => {
    await expect(page).toHaveURL(/.*session\//)
    await expect(page.locator('h1')).toContainText('Session in Progress')
    await expect(page.locator('.palantir-orb')).toBeVisible()
  })

  test('has mic button and transcript area', async ({ page }) => {
    await expect(page.locator('button:has-text("Press to Speak")')).toBeVisible()
    await expect(page.locator('text=Adventure Log')).toBeVisible()
  })

  test('ends session and returns to campaign', async ({ page }) => {
    await page.click('text=End Session')
    await expect(page).toHaveURL(/.*campaigns\//)
  })
})

test.describe('Billing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup')
    await page.fill('input[id="name"]', 'Test Hero')
    await page.fill('input[id="email"]', 'test@test.com')
    await page.click('button:has-text("Create Account")')
  })

  test('shows current plan and available plans', async ({ page }) => {
    await page.goto('/billing')
    await expect(page.locator('h1')).toContainText('Your Plan')
    await expect(page.locator('text=Current: Free')).toBeVisible()
    await expect(page.locator('text=Young Adventurers')).toBeVisible()
    await expect(page.locator('text=Family Quest')).toBeVisible()
    await expect(page.locator('text=Adventurer')).toBeVisible()
    await expect(page.locator('text=Veteran')).toBeVisible()
  })

  test('shows adventure pass section', async ({ page }) => {
    await page.goto('/billing')
    await expect(page.locator('text=Adventure Pass')).toBeVisible()
    await expect(page.locator('text=Kids Tiers')).toBeVisible()
    await expect(page.locator('text=Adult Tiers')).toBeVisible()
  })
})

test.describe('Responsive Design', () => {
  test('works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    await expect(page.locator('h1')).toContainText('Your AI Dungeon Master Awaits')
  })

  test('session page works on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/signup')
    await page.fill('input[id="name"]', 'Test Hero')
    await page.fill('input[id="email"]', 'test@test.com')
    await page.click('button:has-text("Create Account")')

    await page.click('text=+ New Campaign')
    await page.fill('input[name="name"]', 'Mobile Session')
    await page.click('button:has-text("Create Campaign")')

    await page.click('button:has-text("Start Session")')

    await expect(page.locator('.palantir-orb')).toBeVisible()
    await expect(page.locator('button:has-text("Press to Speak")')).toBeVisible()
  })
})
