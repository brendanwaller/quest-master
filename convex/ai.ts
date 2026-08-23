import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// System prompt: still age-appropriate, but now the DM emits tool calls for state changes
const SYSTEM_PROMPT = `You are the Quest Master, a warm, encouraging AI Game Master for young adventurers (ages 7-13). You guide collaborative, voice-first fantasy adventures.

KEY PRINCIPLES:
- Always be warm, encouraging, and playful
- Never describe graphic violence, gore, or scary content
- Keep language simple and accessible for children
- Celebrate creative problem-solving over combat
- Adventures are about discovery, friendship, and wonder
- NPCs are kind, quirky, and memorable
- Failures are learning moments, not punishments
- End each response with a clear choice or question for the players

TONE: Like a favorite storyteller uncle/aunt. Warm, adventurous, story-forward.

RESPONSE FORMAT:
- Narrate in second person ("You see...", "The door creaks open...")
- Keep responses to 3-5 paragraphs max
- End with a clear choice or question
- Include sensory details (sounds, smells, light, texture)

When players take actions that change the game world (damage, healing, items, flags, NPC trust, dice rolls), you MUST emit the corresponding effect as a tool call. The resolver will validate and apply them.

EFFECT TYPES YOU CAN USE:
- damage: { target, amount, reason } - deal damage to a character/monster
- heal: { target, amount, reason } - restore HP
- grant_item: { target, itemId, reason } - add item to inventory
- remove_item: { target, itemId, reason } - remove item
- set_flag: { flag, reason } - set a world flag (whitelisted: quest_active, quest_complete, boss_alert, secret_found, ally_recruited, item_identified, trap_disarmed)
- adjust_npc: { target, amount, reason } - change NPC trust (-5 to +5)
- roll_dice: { target, diceNotation, reason } - roll dice (e.g., "2d6+3")

CURRENT CONTEXT: {context}

Player: {playerInput}

DM:`;

interface DMInput {
  playerInput: string;
  context: {
    campaignName: string;
    setting: string;
    characters: Array<{ name: string; class: string; race: string; hp: number; maxHp: number }>;
    recentExchanges: Array<{ role: string; content: string }>;
  };
}

export const generateDMResponse = action({
  args: { input: v.any() },
  handler: async (_ctx, args) => {
    const { input } = args as { input: DMInput };

    // Build context string
    const charList = input.context.characters
      .map(c => `${c.name} (${c.race} ${c.class}, HP: ${c.hp}/${c.maxHp})`)
      .join(", ");

    const recentHistory = input.context.recentExchanges
      .slice(-6)
      .map(e => `${e.role === "player" ? "Player" : "DM"}: ${e.content}`)
      .join("\n");

    const contextString = `\nCampaign: ${input.context.campaignName} (${input.context.setting})\nActive Characters: ${charList}\nRecent History:\n${recentHistory}\n`;

    // Build the full prompt for the LLM
    const fullPrompt = SYSTEM_PROMPT.replace("{context}", contextString)
      .replace("{playerInput}", input.playerInput);

    // TODO: Replace with actual OpenRouter call using family engine (Qwen3-235B)
    // For now, return a mock that demonstrates the EffectRequest structure
    const mockResponse = generateMockResponse(input.playerInput, input.context.characters);

    return mockResponse;
  },
});

function generateMockResponse(playerInput: string, characters: Array<{name: string}>) {
  const lower = playerInput.toLowerCase();
  const name = characters[0]?.name || "Hero";

  // Combat-like action -> damage effect
  if (lower.includes("attack") || lower.includes("fight") || lower.includes("hit") || lower.includes("strike")) {
    return {
      narration: `You raise your weapon and strike at the goblin! The blade catches the torchlight as it arcs through the air. The goblin yelps and stumbles back, clutching its side. It hisses, eyes narrowing — it's hurt, but not beaten yet. What do you do next?`,
      effects: [
        { type: "damage", target: "goblin_1", amount: 3, reason: `${name} attacks with sword` },
        { type: "adjust_npc", target: "goblin_1", amount: -1, reason: "goblin injured, now hostile" },
      ],
    };
  }

  // Healing action
  if (lower.includes("heal") || lower.includes("cure") || lower.includes("bandage") || lower.includes("potion")) {
    return {
      narration: `You pull out a glowing vial and drink deeply. Warm golden light spreads through your body, knitting scrapes and bruises. You feel strength returning. The potion's magic fizzles away, leaving a sweet taste. What now?`,
      effects: [
        { type: "heal", target: name.toLowerCase().replace(" ", "_"), amount: 4, reason: "healing potion" },
        { type: "remove_item", target: name.toLowerCase().replace(" ", "_"), itemId: "healing_potion", reason: "consumed" },
      ],
    };
  }

  // Search/loot
  if (lower.includes("search") || lower.includes("loot") || lower.includes("take") || lower.includes("pick up")) {
    return {
      narration: `You search carefully and find a small leather pouch tucked beneath a loose stone. Inside: a shimmering silver key and a folded map! The key feels warm in your palm. The map shows a hidden passage. Exciting! Where will you use them?`,
      effects: [
        { type: "grant_item", target: name.toLowerCase().replace(" ", "_"), itemId: "silver_key", reason: "found in hidden pouch" },
        { type: "grant_item", target: name.toLowerCase().replace(" ", "_"), itemId: "secret_map", reason: "found with key" },
        { type: "set_flag", flag: "secret_found", reason: "discovered hidden pouch" },
      ],
    };
  }

  // Dice roll
  if (lower.includes("roll") || lower.includes("dice") || lower.includes("check")) {
    return {
      narration: `You take a deep breath and roll the dice. They clatter across the stone, spinning, spinning... and land! The numbers glow faintly. The fates have spoken. What does this mean for your next move?`,
      effects: [
        { type: "roll_dice", target: name.toLowerCase().replace(" ", "_"), diceNotation: "1d20+2", reason: "ability check" },
      ],
    };
  }

  // Default: narrative response
  const responses = [
    `The ancient oak door swings open with a gentle creak, revealing a cozy library filled with glowing books. Dust motes dance in shafts of golden light. A friendly ghost librarian waves from behind the desk. "Welcome, young adventurers! What knowledge do you seek?" What do you do?`,
    `A silver fox with emerald eyes pads silently from the shadows, its fur shimmering with starlight. It doesn't speak, but you understand — it wants you to follow. The fox leads you toward a glittering cave entrance where crystals hum a lullaby. Do you follow?`,
    `The marketplace bustles with friendly merchants selling cloud-cotton candy, laughter-in-a-jar, and maps that rewrite themselves. A kindly gnome offers you a sparkling compass that points to "your heart's true desire." The needle spins wildly, then settles pointing... toward each other. How sweet! What's your first stop?`,
  ];

  return {
    narration: responses[Math.floor(Math.random() * responses.length)],
    effects: [],
  };
}

// Avatar description generator (kept from original)
export const generateAvatarDescription = action({
  args: { name: v.string(), class: v.string(), race: v.string() },
  handler: async (_ctx, args) => {
    const article = /^[aeiou]/i.test(args.race) ? "an" : "a";
    return `Whimsical storybook fantasy portrait of ${article} ${args.race.toLowerCase()} ${args.class.toLowerCase()} named ${args.name}, child-friendly, expressive face, soft painterly style, warm magical rim light, subtle sparkle, cozy adventure mood, dark background, no text, no watermark`;
  },
});

// Session summary (kept from original)
export const generateSessionSummary = action({
  args: {
    exchanges: v.array(v.object({ role: v.string(), content: v.string() })),
    campaignName: v.string(),
    characters: v.array(v.object({ name: v.string(), class: v.string(), race: v.string() })),
  },
  handler: async (_ctx, args) => {
    const charNames = args.characters.map(c => `${c.name} (${c.race} ${c.class})`).join(", ");
    const dmBeats = args.exchanges
      .filter(e => e.role === "dm")
      .map(e => e.content)
      .slice(-4);
    const playerBeats = args.exchanges
      .filter(e => e.role === "player")
      .map(e => e.content)
      .slice(-4);

    const whatHappened = dmBeats.length
      ? dmBeats.join(" ")
      : "The party gathered, listened to the Palantir, and began a new adventure.";
    const choices = playerBeats.length
      ? playerBeats.join(" ")
      : "The heroes chose to explore carefully and help one another.";

    return [
      `**Session Recap: ${args.campaignName}**`,
      `**Heroes:** ${charNames || "The new party"}.`,
      `**What happened:** ${whatHappened}`,
      `**Choices that mattered:** ${choices}`,
      "**Next hook:** The Palantir glows with one last clue, hinting that the next chapter begins where this one ended.",
    ].join("\n\n");
  },
});