// ============================================================================
// Quest Master — Client-side persistence (localStorage). No dead backend.
// ============================================================================
import {
  STORAGE_KEYS,
} from "./types";
import type { Campaign, Character, SessionLog, GameState } from "./types";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("Persist failed", e);
  }
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const store = {
  uid,

  getCurrentUser(): { email: string; name: string } | null {
    return read(STORAGE_KEYS.user);
  },
  setCurrentUser(user: { email: string; name: string } | null) {
    write(STORAGE_KEYS.user, user);
  },

  hasConsent(): boolean {
    return !!read<boolean>(STORAGE_KEYS.consent);
  },
  setConsent(v: boolean) {
    write(STORAGE_KEYS.consent, v);
  },
  getAgeTier(): string | null {
    return read(STORAGE_KEYS.ageTier);
  },
  setAgeTier(t: string) {
    write(STORAGE_KEYS.ageTier, t);
  },

  getPlan(): string {
    return read<string>("qm.plan") ?? "free";
  },
  setPlan(p: string) {
    write("qm.plan", p);
  },

  // Campaigns
  listCampaigns(): Campaign[] {
    return read<Campaign[]>(STORAGE_KEYS.campaigns) ?? [];
  },
  getCampaign(id: string): Campaign | null {
    return this.listCampaigns().find((c) => c.id === id) ?? null;
  },
  saveCampaign(c: Campaign) {
    const all = this.listCampaigns();
    const idx = all.findIndex((x) => x.id === c.id);
    if (idx >= 0) all[idx] = c; else all.push(c);
    write(STORAGE_KEYS.campaigns, all);
  },
  deleteCampaign(id: string) {
    write(STORAGE_KEYS.campaigns, this.listCampaigns().filter((c) => c.id !== id));
  },

  // Characters
  listCharacters(): Character[] {
    return read<Character[]>(STORAGE_KEYS.characters) ?? [];
  },
  getCharacter(id: string): Character | null {
    return this.listCharacters().find((c) => c.id === id) ?? null;
  },
  saveCharacter(c: Character) {
    const all = this.listCharacters();
    const idx = all.findIndex((x) => x.id === c.id);
    if (idx >= 0) all[idx] = c; else all.push(c);
    write(STORAGE_KEYS.characters, all);
  },

  // Sessions
  listSessions(): SessionLog[] {
    return read<SessionLog[]>(STORAGE_KEYS.sessions) ?? [];
  },
  getSession(id: string): SessionLog | null {
    return this.listSessions().find((s) => s.id === id) ?? null;
  },
  saveSession(s: SessionLog) {
    const all = this.listSessions();
    const idx = all.findIndex((x) => x.id === s.id);
    if (idx >= 0) all[idx] = s; else all.push(s);
    write(STORAGE_KEYS.sessions, all);
  },

  // Game states
  getGameState(id: string): GameState | null {
    const map = read<Record<string, GameState>>(STORAGE_KEYS.gameStates) ?? {};
    return map[id] ?? null;
  },
  saveGameState(id: string, gs: GameState) {
    const map = read<Record<string, GameState>>(STORAGE_KEYS.gameStates) ?? {};
    map[id] = gs;
    write(STORAGE_KEYS.gameStates, map);
  },
};
