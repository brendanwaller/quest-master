// ============================================================================
// Quest Master — Shared Domain Types
// The contract every module builds against. No dead-backend coupling.
// ============================================================================

// ---- Age tiers (per-venture locked in vault) -------------------------------
export type AgeTierId = "7-9" | "10-12" | "13+";

export interface AgeTier {
  id: AgeTierId;
  label: string;
  tagline: string;
  threat: "cute" | "menace" | "intimidating";
  maxHearts: number;
  desc: string;
}

export const AGE_TIERS: AgeTier[] = [
  {
    id: "7-9",
    label: "Young Adventurers (7-9)",
    tagline: "Cuddly danger, big wonder",
    threat: "cute",
    maxHearts: 8,
    desc: "Playful monsters that are more silly than scary. Every hero wins the day.",
  },
  {
    id: "10-12",
    label: "Trailblazers (10-12)",
    tagline: "Real quests, real courage",
    threat: "menace",
    maxHearts: 10,
    desc: "Braver foes and trickier puzzles. Heroes can face a setback and bounce back.",
  },
  {
    id: "13+",
    label: "Legendaries (13+)",
    tagline: "Epic stakes, deep story",
    threat: "intimidating",
    maxHearts: 12,
    desc: "Richer storytelling and meaningful choices. The world truly hangs in the balance.",
  },
];

// ---- Classes & species ------------------------------------------------------
export interface ClassDef {
  id: string;
  name: string;
  role: "striker" | "defender" | "controller" | "leader";
  powers: string; // kid-friendly one-liner
  hitDie: number;
  icon: string;
}

export interface SpeciesDef {
  id: string;
  name: string;
  trait: string; // kid-friendly "superpower"
  toughness: number; // bonus to maxHp
  icon: string;
}

export const CLASSES: ClassDef[] = [
  { id: "wizard", name: "Wizard", role: "controller", powers: "Casts dazzling spells of ice, fire, and light", hitDie: 4, icon: "🔮" },
  { id: "rogue", name: "Rogue", role: "striker", powers: "Sneaky and lucky, finds hidden treasure", hitDie: 6, icon: "🗡️" },
  { id: "fighter", name: "Fighter", role: "defender", powers: "Strong and brave, protects the whole party", hitDie: 10, icon: "🛡️" },
  { id: "cleric", name: "Cleric", role: "leader", powers: "Heals friends and banishes shadows", hitDie: 6, icon: "✨" },
  { id: "ranger", name: "Ranger", role: "striker", powers: "Sharpshooter who befriends animals", hitDie: 8, icon: "🏹" },
  { id: "bard", name: "Bard", role: "leader", powers: "Sings songs that inspire everyone", hitDie: 6, icon: "🎵" },
  { id: "paladin", name: "Paladin", role: "defender", powers: "A shining knight who smites wickedness", hitDie: 10, icon: "⚔️" },
  { id: "druid", name: "Druid", role: "controller", powers: "Shapeshifts and talks to plants", hitDie: 6, icon: "🌿" },
  { id: "sorcerer", name: "Sorcerer", role: "striker", powers: "Wild magic that crackles from the heart", hitDie: 4, icon: "⚡" },
  { id: "monk", name: "Monk", role: "striker", powers: "Zippy martial arts, quicker than the eye", hitDie: 8, icon: "🥋" },
  { id: "warlock", name: "Warlock", role: "controller", powers: "Borrows power from a mysterious patron", hitDie: 6, icon: "🌙" },
  { id: "barbarian", name: "Barbarian", role: "striker", powers: "Wild rage that makes hits hurt hard", hitDie: 12, icon: "🪓" },
];

export const SPECIES: SpeciesDef[] = [
  { id: "dragonborn", name: "Dragonborn", trait: "Breathes fire and stands brave", toughness: 2, icon: "🐉" },
  { id: "halfling", name: "Halfling", trait: "Super lucky and good with snacks", toughness: 0, icon: "🍀" },
  { id: "gnome", name: "Gnome", trait: "Talks to animals and invents gadgets", toughness: 0, icon: "🧚" },
  { id: "elf", name: "Elf", trait: "Swift and graceful, sees in the dark", toughness: 1, icon: "🧝" },
  { id: "dwarf", name: "Dwarf", trait: "Rock-solid and loves a good forge", toughness: 3, icon: "⛏️" },
  { id: "human", name: "Human", trait: "Never gives up, learns anything fast", toughness: 1, icon: "🦸" },
  { id: "tiefling", name: "Tiefling", trait: "Brave of heart despite spooky looks", toughness: 1, icon: "😈" },
  { id: "orc", name: "Orc", trait: "Mighty and fiercely loyal to friends", toughness: 3, icon: "💪" },
  { id: "tortle", name: "Tortle", trait: "A walking shell that shrugs off hits", toughness: 4, icon: "🐢" },
  { id: "fairy", name: "Fairy", trait: "Tiny, can fly, and sparkles everywhere", toughness: -1, icon: "🦋" },
];

// ---- Starter items -----------------------------------------------------------
export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
}

export const STARTER_ITEMS: ItemDef[] = [
  { id: "locket", name: "Grandpa's Locket", desc: "Warmth and courage from someone who loves you", icon: "📿" },
  { id: "compass", name: "Heart Compass", desc: "Always points toward what you truly care about", icon: "🧭" },
  { id: "lucky_coin", name: "Lucky Coin", desc: "Turns a fumble into a flourish, once in a while", icon: "🪙" },
  { id: "whistle", name: "Silver Whistle", desc: "Summons a helpful friend when you need one", icon: "🎺" },
  { id: "lantern", name: "Lantern of Hopes", desc: "Glows brighter the braver you are", icon: "🏮" },
  { id: "quill", name: "Story Quill", desc: "Writes down your deeds so they're never forgotten", icon: "🖋️" },
];

// ---- Avatar ---------------------------------------------------------------
export interface AvatarPreset {
  palette: string;
  familiar: string;
  emblem: string;
  accessory: string;
}

export const AVATAR_PALETTES = ["#d4a843", "#7f5bd4", "#3fa7a7", "#e06f4f", "#5b9ad4", "#c44f8a"];
export const AVATAR_FAMILIARS = ["🐱", "🦉", "🐉", "🐺", "🦊", "🐸"];
export const AVATAR_EMBLEMS = ["🌙", "🔥", "❄️", "⚡", "🌿", "✨"];
export const AVATAR_ACCESSORIES = ["🧣", "👑", "🎩", "🕶️", "🗡️", "📿"];

// ---- Characters ------------------------------------------------------------
export interface Character {
  id: string;
  name: string;
  classId: string;
  speciesId: string;
  itemId: string;
  hp: number;
  maxHp: number;
  inventory: string[];
  flags: string[];
  avatar: AvatarPreset;
  variant: number; // evolution stage
}

// ---- Enemies ---------------------------------------------------------------
export interface Enemy {
  id: string;
  name: string;
  threat: "cute" | "menace" | "intimidating";
  hp: number;
  maxHp: number;
  emoji: string; // fallback glyph if art not loaded
  art?: string;  // composited transparent/isolated art path (public/enemies)
  desc: string;
  moves: string[];
}

// ---- Campaign / session ----------------------------------------------------
export interface Campaign {
  id: string;
  name: string;
  setting: string;
  ageTier: AgeTierId;
  code: string;
  characterIds: string[];
  sessionCount: number;
  nextHook: string;
  createdAt: number;
}

export interface Exchange {
  role: "player" | "gm";
  content: string;
  ts: number;
}

export interface SessionLog {
  id: string;
  campaignId: string;
  startedAt: number;
  endedAt: number | null;
  summary: string;
  exchanges: Exchange[];
}

export interface GameState {
  characters: Record<string, Character>;
  enemies: Enemy[];
  worldFlags: Record<string, boolean>;
  npcTrust: Record<string, number>;
  seed: number;
}

// ---- Quick choices (contextual, speak-aloud) -------------------------------
export interface QuickChoice {
  label: string;
  prompt: string;
  icon: string;
}

// ---- Persistence keys ------------------------------------------------------
export const STORAGE_KEYS = {
  user: "qm.user",
  campaigns: "qm.campaigns",
  characters: "qm.characters",
  sessions: "qm.sessions",
  gameStates: "qm.gameStates",
  consent: "qm.consent",
  ageTier: "qm.ageTier",
} as const;
