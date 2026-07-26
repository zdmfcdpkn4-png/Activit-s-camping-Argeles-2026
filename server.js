// server.js — QG du séjour Argelès 2026 : statique + /api/sync (Render Web Service)
// Zéro dépendance : Node >= 18 (fetch natif). Démarrage : node server.js
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const PORT = process.env.PORT || 10000;
const RURL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const RTOK = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

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
async function redisGet(key) {
  const r = await fetch(RURL + "/get/" + key, { headers: { Authorization: "Bearer " + RTOK } });
  const j = await r.json();
  if (j && j.result) {
    try {
      const v = JSON.parse(j.result);
      if (v && typeof v === "object") return { state: v.state || {}, resetAt: v.resetAt || 0 };
    } catch (e) { /* valeur illisible : on repart de zéro */ }
  }
  return { state: {}, resetAt: 0 };
}
async function redisSet(key, val) {
  await fetch(RURL + "/set/" + key, { method: "POST", headers: { Authorization: "Bearer " + RTOK }, body: JSON.stringify(val) });
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
    if (!RURL || !RTOK) return json(res, 500, { error: "Redis non configuré (variables UPSTASH_REDIS_REST_URL / _TOKEN manquantes)" });
    const key = "sync:" + trip;
    try {
      const cur = await redisGet(key);
      if (req.method === "POST") {
        let raw = "";
        for await (const c of req) { raw += c; if (raw.length > 1e6) return json(res, 413, { error: "corps trop volumineux" }); }
        let inc = {};
        try { inc = JSON.parse(raw || "{}"); } catch (e) { inc = {}; }
        if (!inc || typeof inc !== "object") inc = {};
        const merged = fusionner(cur, inc);
        if (JSON.stringify(merged) !== JSON.stringify(cur)) await redisSet(key, merged);
        return json(res, 200, merged);
      }
      return json(res, 200, cur);
    } catch (e) { return json(res, 502, { error: "Redis injoignable : " + (e && e.message) }); }
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
