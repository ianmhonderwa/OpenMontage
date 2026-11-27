// Minimal typed client for the OpenSocial management API.
// The owner key is kept in sessionStorage only (cleared when the tab closes) and is
// never rendered. The backend enforces every permission regardless of this UI.

const KEY = "opensocial.ownerKey";

export function getKey(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setKey(value: string | null): void {
  try {
    if (value) sessionStorage.setItem(KEY, value);
    else sessionStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: key lives only in memory for this page */
  }
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const key = getKey();
  if (key) headers["X-API-Key"] = key;
  const res = await fetch(path, { ...options, headers: { ...headers, ...(options.headers as any) } });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new ApiError(res.status, body.error ?? "error", body.message ?? body.detail?.[0]?.msg ?? res.statusText);
  }
  return body as T;
}

export const post = <T = any>(path: string, body: unknown = {}) =>
  api<T>(path, { method: "POST", body: JSON.stringify(body) });
export const patch = <T = any>(path: string, body: unknown) =>
  api<T>(path, { method: "PATCH", body: JSON.stringify(body) });
export const put = <T = any>(path: string, body: unknown) =>
  api<T>(path, { method: "PUT", body: JSON.stringify(body) });

export interface Account {
  account_id: string;
  platform: string;
  display_name: string;
  status: string;
  granted_scopes: string[];
  token_expires_at: string | null;
  connected_at: string | null;
  last_sync_at: string | null;
  autonomy_enabled: boolean;
  autonomous_kinds: string[];
  daily_action_limit: number;
  auth_flow: string;
}

export interface Approval {
  approval_id: string;
  status: string;
  operation: string;
  kind: string;
  platform: string;
  account_id: string | null;
  summary: string;
  content: Record<string, unknown>;
  scheduled_for: string | null;
  requested_by: string;
  decided_by: string | null;
  created_at: string;
  expires_at: string;
  result: Record<string, unknown> | null;
}

export interface Variant {
  variant_id: string;
  platform: string;
  account_id: string | null;
  format: string;
  title: string;
  caption: string;
  hashtags: string[];
  status: string;
  validation: { valid: boolean; errors: string[]; warnings: string[] };
  approval_id: string | null;
  instructions: string;
}

export interface ContentItem {
  item_id: string;
  title: string;
  body: string;
  content_type: string;
  status: string;
  tags: string[];
  variants?: Variant[];
  updated_at: string | null;
}
