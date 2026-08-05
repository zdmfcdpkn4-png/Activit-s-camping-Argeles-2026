// server.js — QG du séjour Argelès 2026 : statique + /api/sync (Render Web Service)
// Node >= 18, une seule dépendance (pg) : persistance PostgreSQL Render.
// Démarrage : node server.js — env : DATABASE_URL (URL interne ou externe de la base)
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import pg from "pg";

const PORT = process.env.PORT || 10000;
const DB_URL = process.env.DATABASE_URL || "";

// TLS exigé par les URL externes Render (…render.com) ; les URL internes
// (hôte dpg-… sans domaine) et un Postgres local n'en veulent pas.
const avecTLS = /\brender\.com\b/i.test(DB_URL) || /\bsslmode=require\b/i.test(DB_URL);
const pool = DB_URL
  ? new pg.Pool({
      connectionString: DB_URL,
      ssl: avecTLS ? { rejectUnauthorized: false } : undefined,
      max: 3,
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 30000,
    })
  : null;
// Sans ce gestionnaire, une connexion inactive coupée par le serveur (maintenance,
// redémarrage de la base) ferait planter tout le processus — comportement documenté de pg.
if (pool) pool.on("error", function (e) { console.error("pg pool :", e.message); });

// La table est créée au premier appel ; en cas d'échec on retentera à la requête suivante.
let tablePrete = null;
function initTable() {
  if (!tablePrete) {
    tablePrete = pool
      .query("CREATE TABLE IF NOT EXISTS sync_state (trip TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())")
      .catch(function (e) { tablePrete = null; throw e; });
  }
  return tablePrete;
}

function fusionner(cur, inc) {
  const merged = { state: { ...cur.state }, resetAt: Math.max(cur.resetAt || 0, Number(inc.resetAt) || 0) };
  const st = inc.state || {};
  for (const k in st) {
    const a = merged.state[k], b = st[k];
    if (b && typeof b.t === "number" && (!a || b.t > a.t)) merged.state[k] = b;
  }
  for (const k in merged.state) {
    if ((merged.state[k].t || 0) < merged.resetAt) delete merged.state[k];
  }
  return merged;
}
async function dbGet(trip) {
  await initTable();
  const r = await pool.query("SELECT data FROM sync_state WHERE trip = $1", [trip]);
  const v = r.rows.length ? r.rows[0].data : null;
  if (v && typeof v === "object") return { state: v.state || {}, resetAt: v.resetAt || 0 };
  return { state: {}, resetAt: 0 };
}
async function dbSet(trip, val) {
  await initTable();
  await pool.query(
    "INSERT INTO sync_state (trip, data, updated_at) VALUES ($1, $2::jsonb, now()) " +
    "ON CONFLICT (trip) DO UPDATE SET data = EXCLUDED.data, updated_at = now()",
    [trip, JSON.stringify(val)]
  );
}
function json(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(obj));
}
const server = createServer(async (req, res) => {
  const u = new URL(req.url, "http://interne");
  if (u.pathname === "/api/sync") {
    const trip = (u.searchParams.get("trip") || "").replace(/[^a-zA-Z0-9_-]/g, "");
    if (!trip) return json(res, 400, { error: "paramètre trip requis" });
    if (!pool) return json(res, 500, { error: "base non configurée (variable DATABASE_URL manquante)" });
    try {
      const cur = await dbGet(trip);
      if (req.method === "POST") {
        let raw = "";
        for await (const c of req) { raw += c; if (raw.length > 1e6) return json(res, 413, { error: "corps trop volumineux" }); }
        let inc = {};
        try { inc = JSON.parse(raw || "{}"); } catch (e) { inc = {}; }
        if (!inc || typeof inc !== "object") inc = {};
        const merged = fusionner(cur, inc);
        if (JSON.stringify(merged) !== JSON.stringify(cur)) await dbSet(trip, merged);
        return json(res, 200, merged);
      }
      return json(res, 200, cur);
    } catch (e) { return json(res, 502, { error: "base injoignable : " + (e && e.message) }); }
  }
  // Icônes : servies en fichiers plutôt qu'en data URI — iOS ignore les data URI
  // pour apple-touch-icon, or c'est là que l'icône compte le plus (écran d'accueil).
  // Les deux fonds d'écran suivent le même chemin. Ce sont les seuls fichiers lourds de
  // l'appli (53 et 44 Ko), chargés en différé par le CSS et jamais sur le chemin critique,
  // gardés un an en cache — ce sont les photos de la famille, elles ne changeront pas.
  const ICONES = {
    "/icone.svg": "image/svg+xml",
    "/icone-180.png": "image/png",
    "/icone-512.png": "image/png",
    "/fond-jour.jpg": "image/jpeg",
    "/fond-nuit.jpg": "image/jpeg",
  };
  if (ICONES[u.pathname]) {
    try {
      const bin = await readFile(new URL("." + u.pathname, import.meta.url));
      const age = u.pathname.endsWith(".jpg") ? 31536000 : 86400;
      res.writeHead(200, { "Content-Type": ICONES[u.pathname], "Cache-Control": "public, max-age=" + age });
      return res.end(bin);
    } catch (e) { return json(res, 404, { error: "fichier introuvable" }); }
  }
  if (u.pathname === "/" || u.pathname === "/index.html") {
    try {
      const html = await readFile(new URL("./index.html", import.meta.url));
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      return res.end(html);
    } catch (e) { return json(res, 500, { error: "index.html introuvable" }); }
  }
  json(res, 404, { error: "introuvable" });
});
server.listen(PORT, () => { console.log("QG du séjour en écoute sur :" + PORT); });
process.on("SIGTERM", () => { server.close(() => process.exit(0)); });
