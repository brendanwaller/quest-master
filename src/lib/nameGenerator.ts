export type CharacterTone =
  | "heroic"
  | "whimsical"
  | "mysterious"
  | "noble"
  | "shadowy"
  | "comedy"
  | "ancient";

export interface GenerateCharacterNamesOptions {
  race: string;
  characterClass: string;
  tone?: CharacterTone;
  count?: number;
}

const RACE_THEMES: Record<string, string[]> = {
  Human: ["bright", "steadfast", "river", "gold", "open"],
  Elf: ["moon", "silver", "leaf", "star", "thorn"],
  Dwarf: ["stone", "iron", "deep", "forge", "amber"],
  Halfling: ["bramble", "merry", "brook", "honey", "green"],
  Gnome: ["spark", "cog", "whistle", "bright", "tinker"],
  "Half-Elf": ["dawn", "willow", "silver", "wind", "song"],
  Tiefling: ["ember", "night", "ruby", "shadow", "ash"],
  Dragonborn: ["scale", "flame", "storm", "frost", "bronze"],
};

const CLASS_THEMES: Record<string, string[]> = {
  Fighter: ["blade", "shield", "valor", "steel", "warden"],
  Wizard: ["spell", "rune", "arcane", "lore", "wisdom"],
  Rogue: ["shade", "whisper", "lock", "swift", "shadow"],
  Cleric: ["light", "mercy", "dawn", "hearth", "grace"],
  Ranger: ["wild", "trail", "hawk", "wood", "storm"],
  Bard: ["song", "lute", "mirth", "tale", "chorus"],
  Barbarian: ["thunder", "fury", "bear", "crash", "claw"],
  Monk: ["quiet", "lotus", "step", "still", "breath"],
  Paladin: ["oath", "honor", "sun", "shield", "right"],
  Sorcerer: ["spark", "bloodline", "flame", "mystic", "glow"],
  Warlock: ["pact", "star", "veil", "raven", "eldritch"],
  Druid: ["moss", "root", "fern", "moon", "grove"],
};

const TONE_PREFIXES: Record<CharacterTone, string[]> = {
  heroic: ["Sir", "Lady", "Captain", "Champion", "Keeper"],
  whimsical: ["Pip", "Tilly", "Bramble", "Fable", "Wren"],
  mysterious: ["Vael", "Nyx", "Raven", "Orin", "Sable"],
  noble: ["Aurelian", "Celestine", "Rowan", "Eldrin", "Maribel"],
  shadowy: ["Dusk", "Vesper", "Morwen", "Kael", "Noctis"],
  comedy: ["Wobble", "Nibs", "Pickles", "Snicker", "Button"],
  ancient: ["Elder", "Aeon", "Thorn", "Myr", "Oath"],
};

const NAME_SUFFIXES = [
  "bright", "briar", "storm", "vale", "heart", "whisper", "crown", "dawn",
  "moon", "ember", "song", "stone", "shade", "leaf", "forge", "wind",
];

export function generateCharacterNames({
  race,
  characterClass,
  tone = "heroic",
  count = 5,
}: GenerateCharacterNamesOptions): string[] {
  const raceWords = RACE_THEMES[race] || ["bright", "brave"];
  const classWords = CLASS_THEMES[characterClass] || ["quest", "hero"];
  const prefixes = TONE_PREFIXES[tone] ?? TONE_PREFIXES.heroic;
  const names = new Set<string>();
  let guard = 0;

  while (names.size < count && guard < count * 20) {
    guard += 1;
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const raceWord = raceWords[Math.floor(Math.random() * raceWords.length)];
    const classWord = classWords[Math.floor(Math.random() * classWords.length)];
    const suffix = NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];

    const pattern = Math.floor(Math.random() * 4);
    const name =
      pattern === 0
        ? `${prefix} ${capitalize(raceWord)}${capitalize(suffix)}`
        : pattern === 1
          ? `${capitalize(classWord)} ${capitalize(raceWord)}`
          : pattern === 2
            ? `${prefix} ${capitalize(classWord)}${capitalize(suffix)}`
            : `${capitalize(raceWord)} ${capitalize(suffix)}`;

    names.add(name);
  }

  return Array.from(names).slice(0, count);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
