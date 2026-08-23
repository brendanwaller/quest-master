import { describe, it, expect, vi, beforeEach } from 'vitest'
import { convexTest } from 'convex-test'
import { schema } from '../convex/schema'
import { api } from '../convex/_generated/api'

// Test helpers
const test = convexTest(schema, api, { 
  log: false,
  maxComponentInstanceDepth: 5,
})

describe('Campaigns', () => {
  let userId: string

  beforeEach(async () => {
    userId = await test.mutation(api.users.createUser, { 
      email: 'test@test.com', 
      name: 'Test User' 
    })
  })

  it('creates a campaign with quest code', async () => {
    const result = await test.mutation(api.campaigns.createCampaign, {
      name: 'Test Campaign',
      setting: 'Fantasy',
      ownerId: userId,
    })

    expect(result.campaignId).toBeDefined()
    expect(result.questCode).toBeDefined()
    expect(result.questCode.length).toBe(6)
  })

  it('generates unique quest codes', async () => {
    const result1 = await test.mutation(api.campaigns.createCampaign, {
      name: 'Campaign 1',
      setting: 'Fantasy',
      ownerId: userId,
    })

    const result2 = await test.mutation(api.campaigns.createCampaign, {
      name: 'Campaign 2',
      setting: 'Fantasy',
      ownerId: userId,
    })

    expect(result1.questCode).not.toBe(result2.questCode)
  })

  it('gets campaigns by owner', async () => {
    await test.mutation(api.campaigns.createCampaign, {
      name: 'Campaign 1',
      setting: 'Fantasy',
      ownerId: userId,
    })

    const campaigns = await test.query(api.campaigns.getCampaigns, { ownerId: userId })
    expect(campaigns.length).toBe(1)
    expect(campaigns[0].name).toBe('Campaign 1')
  })

  it('gets campaign by quest code', async () => {
    const { questCode } = await test.mutation(api.campaigns.createCampaign, {
      name: 'Test Campaign',
      setting: 'Fantasy',
      ownerId: userId,
    })

    const campaign = await test.query(api.campaigns.getCampaignByQuestCode, { questCode })
    expect(campaign).toBeDefined()
    expect(campaign?.name).toBe('Test Campaign')
  })

  it('joins campaign via quest code', async () => {
    const otherUserId = await test.mutation(api.users.createUser, { 
      email: 'other@test.com', 
      name: 'Other User' 
    })

    const { questCode } = await test.mutation(api.campaigns.createCampaign, {
      name: 'Test Campaign',
      setting: 'Fantasy',
      ownerId: userId,
    })

    const campaign = await test.mutation(api.campaigns.joinCampaign, {
      questCode,
      userId: otherUserId,
    })

    expect(campaign.questCode).toBe(questCode)

    // Check membership
    const members = await test.query(api.campaigns.getCampaignMembers, { 
      campaignId: campaign._id 
    })
    expect(members.length).toBe(2)
  })
})

describe('Characters', () => {
  let userId: string
  let campaignId: string

  beforeEach(async () => {
    userId = await test.mutation(api.users.createUser, { 
      email: 'test@test.com', 
      name: 'Test User' 
    })
    const result = await test.mutation(api.campaigns.createCampaign, {
      name: 'Test Campaign',
      setting: 'Fantasy',
      ownerId: userId,
    })
    campaignId = result.campaignId
  })

  it('creates character with class-based HP', async () => {
    const charId = await test.mutation(api.characters.createCharacter, {
      campaignId,
      userId,
      name: 'Hero',
      class: 'Fighter',
      race: 'Human',
      starterItem: 'Rusty Sword',
      avatarDescription: 'A brave fighter',
    })

    expect(charId).toBeDefined()

    const chars = await test.query(api.characters.getCharacters, { campaignId })
    expect(chars.length).toBe(1)
    expect(chars[0].name).toBe('Hero')
    expect(chars[0].class).toBe('Fighter')
    expect(chars[0].maxHp).toBe(10) // Fighter base HP
  })

  it('assigns correct HP for different classes', async () => {
    const classHp: Record<string, number> = {
      Fighter: 10,
      Wizard: 6,
      Rogue: 8,
      Cleric: 8,
      Ranger: 10,
      Barbarian: 12,
    }

    for (const [cls, expectedHp] of Object.entries(classHp)) {
      await test.mutation(api.characters.createCharacter, {
        campaignId,
        userId,
        name: `${cls} Hero`,
        class: cls,
        race: 'Human',
        starterItem: 'Item',
        avatarDescription: 'Test',
      })
    }

    const chars = await test.query(api.characters.getCharacters, { campaignId })
    expect(chars.length).toBeGreaterThanOrEqual(Object.keys(classHp).length)

    for (const char of chars) {
      const expected = classHp[char.class]
      if (expected) {
        expect(char.maxHp).toBe(expected)
      }
    }
  })

  it('updates character HP with bounds', async () => {
    const charId = await test.mutation(api.characters.createCharacter, {
      campaignId,
      userId,
      name: 'Hero',
      class: 'Fighter',
      race: 'Human',
      starterItem: 'Rusty Sword',
      avatarDescription: 'A brave fighter',
    })

    // HP should be clamped to max
    await test.mutation(api.characters.updateCharacterHp, {
      characterId: charId,
      hp: 15, // Above max of 10
    })

    let chars = await test.query(api.characters.getCharacters, { campaignId })
    expect(chars[0].hp).toBe(10)

    // HP should be clamped to 0
    await test.mutation(api.characters.updateCharacterHp, {
      characterId: charId,
      hp: -5,
    })

    chars = await test.query(api.characters.getCharacters, { campaignId })
    expect(chars[0].hp).toBe(0)
  })
})

describe('Sessions', () => {
  let userId: string
  let campaignId: string

  beforeEach(async () => {
    userId = await test.mutation(api.users.createUser, { 
      email: 'test@test.com', 
      name: 'Test User' 
    })
    const result = await test.mutation(api.campaigns.createCampaign, {
      name: 'Test Campaign',
      setting: 'Fantasy',
      ownerId: userId,
    })
    campaignId = result.campaignId
  })

  it('starts and ends session', async () => {
    const sessionId = await test.mutation(api.sessions.startSession, { campaignId })
    expect(sessionId).toBeDefined()

    const sessions = await test.query(api.sessions.getSessions, { campaignId })
    expect(sessions.length).toBe(1)
    expect(sessions[0].startedAt).toBeDefined()
    expect(sessions[0].endedAt).toBeUndefined()

    await test.mutation(api.sessions.endSession, {
      sessionId,
      summary: 'Test session complete',
    })

    const endedSessions = await test.query(api.sessions.getSessions, { campaignId })
    expect(endedSessions[0].endedAt).toBeDefined()
    expect(endedSessions[0].summary).toBe('Test session complete')
  })

  it('adds and retrieves exchanges', async () => {
    const sessionId = await test.mutation(api.sessions.startSession, { campaignId })

    await test.mutation(api.sessions.addExchange, {
      sessionId,
      role: 'player',
      content: 'I attack the goblin',
    })

    await test.mutation(api.sessions.addExchange, {
      sessionId,
      role: 'dm',
      content: 'The goblin dodges',
    })

    const exchanges = await test.query(api.sessions.getExchanges, { sessionId })
    expect(exchanges.length).toBe(2)
    expect(exchanges[0].role).toBe('player')
    expect(exchanges[1].role).toBe('dm')
    expect(exchanges[0].content).toBe('I attack the goblin')
  })
})

describe('Users', () => {
  it('creates user or returns existing', async () => {
    const userId1 = await test.mutation(api.users.createUser, { 
      email: 'test@test.com', 
      name: 'Test User' 
    })

    const userId2 = await test.mutation(api.users.createUser, { 
      email: 'test@test.com', 
      name: 'Different Name' 
    })

    expect(userId1).toBe(userId2)
  })

  it('gets user by email', async () => {
    await test.mutation(api.users.createUser, { 
      email: 'test@test.com', 
      name: 'Test User' 
    })

    const user = await test.query(api.users.getUserByEmail, { email: 'test@test.com' })
    expect(user).toBeDefined()
    expect(user?.email).toBe('test@test.com')
  })

  it('updates user plan', async () => {
    const userId = await test.mutation(api.users.createUser, { 
      email: 'test@test.com', 
      name: 'Test User' 
    })

    await test.mutation(api.users.updateUserPlan, {
      userId,
      planId: 'young_adventurers',
    })

    const user = await test.query(api.users.getUser, { userId })
    expect(user?.planId).toBe('young_adventurers')
  })
})

describe('Plans', () => {
  it('seeds plans', async () => {
    await test.mutation(api.seed.seedPlans)

    const plans = await test.query(api.seed.getPlans)
    expect(plans.length).toBe(8)

    const planKeys = plans.map(p => p.planKey).sort()
    expect(planKeys).toEqual([
      'adventurer',
      'b2b_camp',
      'b2b_classroom',
      'b2b_library',
      'family_quest',
      'free',
      'veteran',
      'young_adventurers',
    ])
  })
})