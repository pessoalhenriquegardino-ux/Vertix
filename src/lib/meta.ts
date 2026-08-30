import crypto from "node:crypto";

const GRAPH_VERSION = "v21.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

// ───────────────────────── Criptografia do token ─────────────────────────
// O Page Access Token do cliente nunca fica em texto puro no banco.
function encryptionKey(): Buffer {
  const secret = process.env.META_TOKEN_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("META_TOKEN_ENCRYPTION_KEY (ou NEXTAUTH_SECRET) não configurado.");
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptToken(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptToken(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

// ───────────────────────── state (OAuth CSRF) ─────────────────────────
// Carrega o clientId através do fluxo OAuth de forma assinada — impede que
// alguém forje o callback e conecte a página de outra pessoa a um cliente
// que não deveria.
export function signMetaState(clientId: string, returnTo: string): string {
  const nonce = crypto.randomBytes(8).toString("hex");
  const payload = Buffer.from(JSON.stringify({ clientId, returnTo, nonce })).toString("base64url");
  const sig = crypto.createHmac("sha256", process.env.NEXTAUTH_SECRET!).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyMetaState(state: string): { clientId: string; returnTo: string } | null {
  const [payload, sig] = state.split(".");
  if (!payload || !sig) return null;
  const expected = crypto.createHmac("sha256", process.env.NEXTAUTH_SECRET!).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
}

// ───────────────────────── assinatura do webhook ─────────────────────────
export function verifyMetaWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = crypto
    .createHmac("sha256", process.env.META_APP_SECRET!)
    .update(rawBody)
    .digest("hex");
  const given = signatureHeader.slice("sha256=".length);
  const a = Buffer.from(given, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ───────────────────────── OAuth / Graph API ─────────────────────────
export function getMetaRedirectUri(): string {
  return `${process.env.NEXTAUTH_URL}/api/meta/callback`;
}

const SCOPES = ["pages_show_list", "pages_manage_metadata", "pages_read_engagement", "leads_retrieval"].join(",");

export function buildMetaAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: getMetaRedirectUri(),
    state,
    scope: SCOPES,
    response_type: "code",
  });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = `${GRAPH}${path}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? `Falha na chamada ao Meta (${path})`);
  }
  return json as T;
}

export async function exchangeCodeForUserToken(code: string) {
  return graphGet<{ access_token: string; token_type: string; expires_in?: number }>("/oauth/access_token", {
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    redirect_uri: getMetaRedirectUri(),
    code,
  });
}

export async function exchangeForLongLivedToken(shortLivedToken: string) {
  return graphGet<{ access_token: string; token_type: string; expires_in?: number }>("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    fb_exchange_token: shortLivedToken,
  });
}

export async function listManagedPages(userAccessToken: string) {
  const json = await graphGet<{ data: { id: string; name: string; access_token: string }[] }>("/me/accounts", {
    access_token: userAccessToken,
    fields: "id,name,access_token",
  });
  return json.data ?? [];
}

export async function subscribePageToLeadgen(pageId: string, pageAccessToken: string) {
  const url = `${GRAPH}/${pageId}/subscribed_apps`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ subscribed_fields: "leadgen", access_token: pageAccessToken }).toString(),
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? "Falha ao inscrever a página no webhook de leads.");
  }
}

export async function unsubscribePageFromLeadgen(pageId: string, pageAccessToken: string) {
  await fetch(`${GRAPH}/${pageId}/subscribed_apps?access_token=${encodeURIComponent(pageAccessToken)}`, {
    method: "DELETE",
  }).catch(() => {});
}

export type MetaLeadFieldData = { name: string; values: string[] };

export async function fetchLeadgenData(leadgenId: string, pageAccessToken: string) {
  return graphGet<{
    id: string;
    created_time: string;
    form_id?: string;
    field_data: MetaLeadFieldData[];
  }>(`/${leadgenId}`, { access_token: pageAccessToken });
}

// ───────────────────────── mapeamento de campos do lead ─────────────────────────
function normalizeKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, " ");
}

const NAME_ALIASES = ["nome completo", "nome", "full name", "name"].map(normalizeKey);
const EMAIL_ALIASES = ["email", "e mail"].map(normalizeKey);
const PHONE_ALIASES = ["telefone", "phone number", "phone", "celular", "whatsapp"].map(normalizeKey);

function humanizeQuestion(raw: string): string {
  return raw.replace(/_/g, " ").replace(/\s+/g, " ").trim().replace(/^./, (c) => c.toUpperCase());
}

export function mapLeadgenFieldData(fieldData: MetaLeadFieldData[]) {
  let name = "";
  let email: string | null = null;
  let phone: string | null = null;
  const questionLines: string[] = [];

  for (const f of fieldData) {
    const norm = normalizeKey(f.name);
    const value = f.values?.[0]?.trim() ?? "";
    if (!value) continue;

    if (NAME_ALIASES.includes(norm)) name = value;
    else if (EMAIL_ALIASES.includes(norm)) email = value;
    else if (PHONE_ALIASES.includes(norm)) phone = value;
    else questionLines.push(`${humanizeQuestion(f.name)}: ${value}`);
  }

  return { name, email, phone, questionLines };
}
