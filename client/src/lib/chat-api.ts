/*  client/src/lib/api.ts
    --------------------------------------------------------------
    Centralised HTTP helpers for Anxiety-Companion.
    – Reads the API origin from VITE_API_BASE
      · "" (empty)      ➜ same-origin fetch (web dev & prod)
      · "https://..."   ➜ hosted backend (mobile build, staging, prod)
    – Keeps the Anthropic key on the server (the client only
      ever talks to /api/* routes on your Express proxy).
    -------------------------------------------------------------- */

type ClaudeMessage = { role: "user" | "assistant"; content: string };
interface ClaudeRequest {
  messages: ClaudeMessage[];
  model?: string;
  max_tokens?: number;
}

const API_BASE = import.meta.env.VITE_API_BASE ?? ""; // "" = relative

/** POST /api/claude — proxy to Anthropic via Express */
export async function callClaude(req: ClaudeRequest) {
  const res = await fetch(`${API_BASE}/api/claude`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    // Surface server-side errors with a friendlier message
    const text = await res.text();
    throw new Error(`Claude API error (${res.status}): ${text}`);
  }
  return res.json();
}

/** Simple connectivity check used by the mobile app on launch */
export async function pingBackend() {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error("Backend unreachable");
  return res.json() as Promise<{ status: "ok" }>;
}

/** Feature flag so old imports don’t break */
export const CHAT_API_STATUS = {
  USING_REST_API: true,
  WEB_SOCKETS_DISABLED: true,
};
