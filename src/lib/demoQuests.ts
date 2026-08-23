export interface DemoQuest {
  name: string;
  setting: string;
  description: string;
  npcs: { name: string; description: string; relationship: string }[];
  openingScene: string;
  encounters: { title: string; description: string }[];
  twist: string;
  nextHook: string;
}

export const DEMO_QUESTS: Record<string, DemoQuest> = {
  the_hollow_mine: {
    name: "The Hollow Mine",
    setting: "Fantasy",
    description: "A cursed mine holds a dark secret. The party must venture into its depths to uncover the truth behind the disappearances.",
    npcs: [
      {
        name: "Elder Mira",
        description: "An elderly woman who runs the village tavern. Her brother went into the mine three days ago and never returned.",
        relationship: "quest_giver"
      },
      {
        name: "Grath the Dwarf",
        description: "A grizzled miner who refuses to enter the mine anymore. He speaks of strange lights and whispers from below.",
        relationship: "informant"
      },
      {
        name: "The Whisperer",
        description: "A mysterious entity that dwells in the deepest chamber. It claims to be the mine's original guardian, corrupted by a dark ritual.",
        relationship: "antagonist"
      }
    ],
    openingScene: "The village of Hollowford huddles against the mountainside, its streets half-empty. Elder Mira meets you at the tavern door, her eyes red from sleepless nights. 'My brother Davrin went into the mine three days ago. No one else will go. Will you find him — and bring him home?' The mine entrance yawns open like a wound in the mountainside, a faint green light pulsing from within.",
    encounters: [
      {
        title: "The Collapsed Tunnel",
        description: "The main passage is blocked by a recent collapse. The party must find an alternate route through an old flooded shaft or try to dig through the rubble."
      },
      {
        title: "The Forgotten Shrine",
        description: "Deep in the mine, an ancient shrine to a forgotten god stands intact. Strange runes glow on the walls. Touching them triggers a vision of the mine's past — and a warning."
      },
      {
        title: "Davrin's Camp",
        description: "The missing miner's camp is found abandoned, supplies scattered. His journal describes 'the voice that calls from below' and sketches of a massive underground chamber."
      },
      {
        title: "The Whisperer's Chamber",
        description: "The deepest chamber opens into an enormous cavern where a corrupted spirit guards a sealed portal. Davrin is alive but trapped in a magical stasis."
      }
    ],
    twist: "The Whisperer was once the mine's guardian spirit, but a greedy mining company performed a dark ritual to extract more ore, corrupting the guardian. The Whisperer isn't evil — it's in pain and trying to protect the surface world from what lies beneath the sealed portal.",
    nextHook: "The sealed portal pulses with dark energy. Whatever lies beneath is still there, still waiting. And the mining company that corrupted the guardian? They have operations in three other mountain villages. The party's work is far from over."
  }
};
