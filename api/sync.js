// api/sync.js — Fonction serverless Vercel : synchronisation du roadbook.
//
// Contrat (cf. README) :
//   GET  /api/sync?trip=<id>                -> 200 { state }
//   POST /api/sync?trip=<id>  { state }     -> 200 { state fusionné }
//                                              400 trip manquant · 413 état trop gros
//                                              500 stockage non configuré · 502 Redis injoignable
//
// État : { items: { <id>: { v: bool, ts: ms } }, resetAt: ms }
// Fusion item par item : l'horodatage `ts` le plus récent gagne ; tout item
// antérieur ou égal à `resetAt` est effacé (remise à zéro globale).
// Le serveur n'écrit dans Redis que si l'état fusionné diffère de l'état stocké.

const MAX_STATE_BYTES = 120_000;
const MAX_ITEMS = 2000;
const MAX_KEY_LEN = 120;
const TRIP_RE = /^[a-zA-Z0-9_-]{1,64}$/;
const TOO_LARGE = Symbol('tooLarge');

const emptyState = () => ({ items: {}, resetAt: 0 });

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Accepte les variables Upstash directes ou celles injectées par Vercel KV.
function redisEnv() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ''), token } : null;
}

// Une commande Redis via l'API REST Upstash : POST ["GET","clé"] etc.
async function redis(env, command) {
  const res = await fetch(env.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`redis http ${res.status}`);
  const data = await res.json();
  if (data && typeof data === 'object' && data.error) throw new Error(String(data.error));
  return data ? data.result : null;
}

function getTrip(req) {
  const q = req.query && req.query.trip;
  if (typeof q === 'string' && q) return q;
  if (Array.isArray(q) && q.length) return String(q[0]);
  try {
    return new URL(req.url, 'http://local').searchParams.get('trip') || '';
  } catch {
    return '';
  }
}

// Ne conserve que des entrées bien formées ; borne les horodatages à un
// futur proche pour qu'un téléphone à l'horloge folle ne verrouille pas l'état.
function sanitize(raw, now) {
  const out = emptyState();
  if (!raw || typeof raw !== 'object') return out;
  const maxTs = now + 120_000;
  const resetAt = Number(raw.resetAt);
  out.resetAt = Number.isFinite(resetAt) && resetAt > 0 ? Math.min(resetAt, maxTs) : 0;
  if (raw.items && typeof raw.items === 'object') {
    let n = 0;
    for (const [key, item] of Object.entries(raw.items)) {
      if (!key || key.length > MAX_KEY_LEN) continue;
      if (!item || typeof item !== 'object') continue;
      const ts = Number(item.ts);
      if (!Number.isFinite(ts) || ts <= 0) continue;
      out.items[key] = { v: !!item.v, ts: Math.min(ts, maxTs) };
      if (++n >= MAX_ITEMS) break;
    }
  }
  return out;
}

function merge(a, b) {
  const resetAt = Math.max(a.resetAt || 0, b.resetAt || 0);
  const items = {};
  for (const source of [a.items, b.items]) {
    for (const [key, item] of Object.entries(source)) {
      if (item.ts <= resetAt) continue;
      if (!items[key] || item.ts > items[key].ts) items[key] = item;
    }
  }
  return { items, resetAt };
}

// Sérialisation à clés triées pour comparer deux états indépendamment
// de l'ordre d'insertion.
function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  return (
    '{' +
    Object.keys(value)
      .sort()
      .map((k) => JSON.stringify(k) + ':' + stableStringify(value[k]))
      .join(',') +
    '}'
  );
}

async function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try { return JSON.parse(req.body); } catch { return null; }
    }
    if (Buffer.isBuffer(req.body)) {
      try { return JSON.parse(req.body.toString('utf8')); } catch { return null; }
    }
    return req.body;
  }
  try {
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > MAX_STATE_BYTES) return TOO_LARGE;
      chunks.push(chunk);
    }
    if (!chunks.length) return null;
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  cors(res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const trip = getTrip(req);
  if (!TRIP_RE.test(trip)) {
    return res.status(400).json({ error: 'missing_or_invalid_trip' });
  }

  const env = redisEnv();
  if (!env) {
    return res.status(500).json({
      error: 'storage_not_configured',
      hint: 'Connecter une base Redis Upstash au projet Vercel puis redéployer (cf. README).',
    });
  }

  const contentLength = Number((req.headers && req.headers['content-length']) || 0);
  if (contentLength > MAX_STATE_BYTES) {
    return res.status(413).json({ error: 'state_too_large' });
  }

  const key = `roadbook:${trip}`;
  const now = Date.now();

  let stored = emptyState();
  try {
    const raw = await redis(env, ['GET', key]);
    if (typeof raw === 'string' && raw) {
      try { stored = sanitize(JSON.parse(raw), now); } catch { stored = emptyState(); }
    }
  } catch {
    return res.status(502).json({ error: 'redis_unreachable' });
  }

  if (req.method === 'GET') {
    return res.status(200).json({ state: stored });
  }

  const body = await readBody(req);
  if (body === TOO_LARGE) {
    return res.status(413).json({ error: 'state_too_large' });
  }
  const clientState = sanitize(body && typeof body === 'object' ? (body.state ?? body) : null, now);

  const merged = merge(stored, clientState);
  const serialized = JSON.stringify(merged);
  if (serialized.length > MAX_STATE_BYTES) {
    return res.status(413).json({ error: 'state_too_large' });
  }

  if (stableStringify(merged) !== stableStringify(stored)) {
    try {
      await redis(env, ['SET', key, serialized]);
    } catch {
      return res.status(502).json({ error: 'redis_unreachable' });
    }
  }

  return res.status(200).json({ state: merged });
}
