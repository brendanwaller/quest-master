// ============================================================================
// Quest Master — Adventure library: enemy catalog + starter quest (Hollow Mine).
// Enemies are pre-authored, reusable assets composited over the orb.
// ============================================================================
import type { Enemy, QuickChoice, AgeTierId } from "./types";

export interface SceneNode {
  id: string;
  type: "scene" | "encounter" | "social" | "exploration" | "reward" | "hook" | "cliffhanger";
  narration: string;
  enemies: string[]; // enemy ids that spawn
  quickChoices: QuickChoice[];
  unlocks: string[]; // flags that must be set to reach this node
  branches: { flag: string; nodeId: string }[];
  loot?: string;
  milestone?: string;
}

// ---- Enemy catalog ----------------------------------------------------------
export const ENEMY_LIBRARY: Record<string, Enemy> = {
  goblin_snack: {
    id: "goblin_snack", name: "Goblin Pickpocket", threat: "cute", hp: 5, maxHp: 5,
    emoji: "👺", desc: "A scrawny goblin with a stolen cookie bag, more mischievous than mean.",
    moves: ["Sneaky nibble", "Tickle dart"],
  },
  goblin_brute: {
    id: "goblin_brute", name: "Goblin Bruiser", threat: "menace", hp: 8, maxHp: 8,
    emoji: "🥊", desc: "A loud goblin with a heavy wooden club and a chip on its shoulder.",
    moves: ["Heavy whack", "Stompy charge"],
  },
  slime_jelly: {
    id: "slime_jelly", name: "Mine Slime", threat: "cute", hp: 6, maxHp: 6,
    emoji: "🫧", desc: "A jiggly purple slime that glows faintly and boings when poked.",
    moves: ["Boing tackle", "Sticky plop"],
  },
  cave_wolf: {
    id: "cave_wolf", name: "Cave Wolf", threat: "menace", hp: 7, maxHp: 7,
    emoji: "🐺", desc: "A shaggy wolf with glowing amber eyes, guarding its den.",
    moves: ["Swift nip", "Howling cry"],
  },
  quartz_ghost: {
    id: "quartz_ghost", name: "Quartz Ghost", threat: "intimidating", hp: 9, maxHp: 9,
    emoji: "👻", desc: "A translucent wisp of a miner who guards a forgotten treasure. Not cruel, just lonely.",
    moves: ["Cold shimmer", "Wispy moan"],
  },
  crystal_spider: {
    id: "crystal_spider", name: "Crystal Spider", threat: "menace", hp: 8, maxHp: 8,
    emoji: "🕷️", desc: "A spider with a sparkling jewel on its back. It's more curious than creepy.",
    moves: ["Silk snare", "Jewel flash"],
  },
  mimic_chest: {
    id: "mimic_chest", name: "Hungry Chest", threat: "menace", hp: 10, maxHp: 10,
    emoji: "📦", desc: "A treasure chest with a tongue and a grin. It just wants a friendly game.",
    moves: ["Snappy lid", "Bite of mischief"],
  },
  troll_moss: {
    id: "troll_moss", name: "Moss Troll", threat: "intimidating", hp: 14, maxHp: 14,
    emoji: "🧌", desc: "A sleepy moss-covered troll blocking the bridge. Asks riddles, not fights.",
    moves: ["Rumble step", "Riddle glare"],
  },
  ember_drake: {
    id: "ember_drake", name: "Ember Drake", threat: "intimidating", hp: 16, maxHp: 16,
    emoji: "🐉", desc: "The young dragon at the heart of the Hollow Mine, guarding a warm glowing gem.",
    moves: ["Warm puff", "Tail sweep", "Roaring yawn"],
  },
};

// ---- Starter quest: The Hollow Mine (node graph, 5-beat structure) ---------
export const HOLLOW_MINE: { id: string; name: string; setting: string; intro: string; nodes: Record<string, SceneNode>; start: string } = {
  id: "hollow_mine",
  name: "The Hollow Mine",
  setting: "A cozy mining village nestled against a glittering crystal mountain.",
  intro: `Welcome to Emberhollow, where the mountains sing with hidden treasure and the mine holds a secret at its heart. The villagers tell of a warm glow deep underground, and a young dragon named Ember who guards something precious. Tonight, brave ${"{party}"}, the adventure begins.`,
  nodes: {
    start: {
      id: "start", type: "scene",
      narration: `The mine entrance yawns before you, its timbers wrapped in glowing blue moss. A cool, sweet-smelling breeze drifts up from below, carrying the faint chime of crystal. An old sign reads: "Ember's Hollow — Mind the Glow, Mind the Grin." The torch at the entrance flickers... and lights itself green.`,
      enemies: [], quickChoices: [
        { label: "Go inside", prompt: "We step bravely into the mine.", icon: "🕯️" },
        { label: "Look around first", prompt: "We search the entrance area first.", icon: "🔍" },
        { label: "Knock on the sign", prompt: "We tap the sign to see what happens.", icon: "🪵" },
      ], unlocks: [],
      branches: [
        { flag: "secret_found", nodeId: "secret_passage" },
      ],
    },
    entrance: {
      id: "entrance", type: "exploration",
      narration: `Inside, the mine glitters with scattered quartz. Rusted carts rest along the walls. Ahead, the tunnel splits: left leads toward a rhythmic snoring sound, right toward a humming purple glow.`,
      enemies: [{ "id": "slime_jelly" } as any].map(() => "slime_jelly"),
      quickChoices: [
        { label: "Follow the snore", prompt: "We follow the snoring sound.", icon: "💤" },
        { label: "Follow the glow", prompt: "We head toward the purple glow.", icon: "💜" },
        { label: "Search the carts", prompt: "We search the old mining carts.", icon: "🛒" },
      ], unlocks: [],
      branches: [],
    },
    cart_room: {
      id: "cart_room", type: "reward",
      narration: `You rummage through the carts and find a tiny leather pouch under a rusty pickaxe. Inside: a silver key that hums faintly, and a note: "For the brave-hearted, the deep answer waits below."`,
      enemies: [], loot: "silver_key", quickChoices: [
        { label: "Follow the hum", prompt: "We follow where the key hums.", icon: "🔑" },
        { label: "Press deeper", prompt: "We continue deeper into the mine.", icon: "⬇️" },
      ], unlocks: [],
      branches: [],
    },
    encounter_goblin: {
      id: "encounter_goblin", type: "encounter",
      narration: `A high-pitched giggle echoes, and a Goblin Pickpocket drops from the ceiling! It's clutching a bag of stolen cookies and looks more mischievous than mean. "Cookie or crossing!" it squeaks.`,
      enemies: ["goblin_snack"], quickChoices: [
        { label: "Befriend it", prompt: "We offer to share a snack with the goblin.", icon: "🍪" },
        { label: "Stand tall", prompt: "We stand brave and ask it to let us pass.", icon: "🛡️" },
        { label: "Play a trick", prompt: "We play a silly trick to distract it.", icon: "🎭" },
      ], unlocks: [], branches: [],
    },
    encounter_wolf: {
      id: "encounter_wolf", type: "encounter",
      narration: `From the shadows pads a shaggy Cave Wolf, ears back. It isn't snarling, it's whimpering, pawing at a trapped crystal spider wriggling under a fallen beam. The wolf looks to you with pleading eyes.`,
      enemies: ["cave_wolf"], quickChoices: [
        { label: "Help the spider", prompt: "We carefully lift the beam to free the spider.", icon: "🕷️" },
        { label: "Calm the wolf", prompt: "We kneel and speak softly to the wolf.", icon: "🐺" },
        { label: "Creep past", prompt: "We try to slip past quietly.", icon: "🤫" },
      ], unlocks: [], branches: [],
    },
    troll_bridge: {
      id: "troll_bridge", type: "social",
      narration: `The tunnel opens onto a chasm crossed by a rickety bridge. A Moss Troll sits squarely in the middle, yawning. "No cross, no fuss," it rumbles, "until you answer my riddle: What grows down as it goes up?"`,
      enemies: ["troll_moss"], quickChoices: [
        { label: "A path?", prompt: "Is it a path? I say a path.", icon: "🛤️" },
        { label: "A flame?", prompt: "Is it a flame? I say a flame.", icon: "🔥" },
        { label: "A shadow?", prompt: "Is it a shadow? I say a shadow.", icon: "🌑" },
      ], unlocks: [], branches: [],
    },
    cliffhanger: {
      id: "cliffhanger", type: "cliffhanger",
      narration: `At last the mine opens into a vast cavern pulsing with warm light. There, curled around a glowing crimson gem, sleeps the Ember Drake, a young dragon whose scales shimmer like coals at dawn. Its tail twitches as it dreams. The gem pulses in time with its heart. This is the heart of the Hollow Mine... but the session grows late. The orb dims, and a question hangs in the air: Will the party approach the sleeping dragon, or slip away to plan? Tomorrow, the answer.`,
      enemies: ["ember_drake"], quickChoices: [
        { label: "Approach gently", prompt: "We approach the sleeping dragon gently.", icon: "🐉" },
        { label: "Stay and watch", prompt: "We watch from the shadows for now.", icon: "👀" },
        { label: "Head home", prompt: "We return to the village to rest.", icon: "🏡" },
      ], unlocks: [], branches: [],
    },
  },
  start: "start",
};
