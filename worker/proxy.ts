// ============================================================================
// Quest Master — Cloudflare Worker: OpenRouter key-proxy.
// Keeps the OpenRouter API key server-side so a static deploy never ships it
// to the browser. The browser calls THIS worker; the worker injects the key.
//
// Deploy:
//   npx wrangler deploy  (from a directory containing this file + wrangler.toml)
// Set the secret:  npx wrangler secret put OPENROUTER_API_KEY
//
// The frontend calls the proxy by setting VITE_OPENROUTER_PROXY to the worker
// URL (e.g. https://qm-gm-proxy.<account>.workers.dev). When set, gm.ts uses
// it instead of calling OpenRouter directly with a baked-in key.
// ============================================================================
export interface Env {
  OPENROUTER_API_KEY: string;
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const ALLOWED_MODELS = new Set(["stealth/ox-alpha"]);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Only POST, and only the chat completions path.
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    if (!env.OPENROUTER_API_KEY) {
      return new Response("Server not configured", { status: 503 });
    }

    // Parse the client's request but NEVER trust its Authorization header.
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response("Bad JSON", { status: 400 });
    }

    const payload = body as {
      model?: string;
      messages?: unknown;
      temperature?: number;
      max_tokens?: number;
      reasoning_effort?: string;
      response_format?: unknown;
    };

    // Only allow the models this app is permitted to use.
    if (!payload.model || !ALLOWED_MODELS.has(payload.model)) {
      return new Response(`Model not allowed: ${payload.model}`, { status: 403 });
    }

    // Forward to OpenRouter with the server-side key (never expose it).
    const upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "X-Title": "Quest Master",
      },
      body: JSON.stringify({
        model: payload.model,
        messages: payload.messages,
        temperature: payload.temperature ?? 0.9,
        max_tokens: payload.max_tokens ?? 900,
        reasoning_effort: payload.reasoning_effort ?? "low",
        response_format: payload.response_format ?? { type: "json_object" },
      }),
    });

    // Relay the response (but never headers that could leak the key).
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  },
};
