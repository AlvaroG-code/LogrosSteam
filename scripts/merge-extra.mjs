// Fusiona appids de data/extra.json (juegos perfectos que GetOwnedGames no devuelve)
// en data/games.json con sus logros reales. Uso: node scripts/merge-extra.mjs
import { writeFile, readFile } from "node:fs/promises";

try {
  const env = await readFile(".env", "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {}
const KEY = process.env.STEAM_API_KEY;
const ID = process.env.STEAM_ID || "76561198124408238";
if (!KEY) { console.error("Falta STEAM_API_KEY en .env"); process.exit(1); }

async function get(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
async function storeName(appid) {
  try {
    const j = await get(`https://store.steampowered.com/api/appdetails?appids=${appid}&l=spanish`);
    return j[String(appid)]?.data?.name || null;
  } catch { return null; }
}

let extra = { appids: [1903340, 1888930, 731490, 1562430, 2062430, 50300] };
try { extra = JSON.parse(await readFile("data/extra.json", "utf8")); } catch {}
const db = JSON.parse(await readFile("data/games.json", "utf8"));
const have = new Set(db.games.map(g => g.appid));

for (const appid of extra.appids || []) {
  if (have.has(appid)) { console.log(appid, "ya está"); continue; }
  console.log("procesando", appid);
  const [schema, player, name] = await Promise.all([
    get(`https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${KEY}&appid=${appid}&l=spanish`).catch(() => null),
    get(`https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${appid}&key=${KEY}&steamid=${ID}&l=spanish`).catch(() => null),
    storeName(appid)
  ]);
  const defs = schema?.game?.availableGameStats?.achievements ?? [];
  const pa = player?.playerstats?.achievements ?? [];
  const map = Object.fromEntries(pa.map(a => [a.apiname, a]));
  const unlocked = pa.filter(a => a.achieved === 1).length;
  const total = defs.length || null;
  const percent = total ? Math.round((unlocked / total) * 100) : null;
  db.games.push({
    appid,
    name: name || schema?.game?.gameName || `App ${appid}`,
    playtime_forever_min: 0,
    playtime_2weeks_min: 0,
    rtime_last_played: 0,
    img_icon_url: "",
    totalAchievements: total,
    unlockedAchievements: unlocked,
    percent,
    completed: percent === 100,
    manualCompleted: false,
    source: "extra",
    achievements: defs.map(a => ({
      name: a.name, displayName: a.displayName, description: a.description || "",
      icon: a.icon, icongray: a.icongray,
      achieved: map[a.name]?.achieved === 1, unlocktime: map[a.name]?.unlocktime || 0
    }))
  });
  await new Promise(r => setTimeout(r, 400));
}

db.lastSync = new Date().toISOString();
await writeFile("data/games.json", JSON.stringify(db, null, 2));
await writeFile("data/extra.json", JSON.stringify({ note: "AppIDs perfectos que GetOwnedGames no devuelve; el sync los conserva", appids: extra.appids }, null, 2));

// Recalcular stats del perfil
const profile = JSON.parse(await readFile("data/profile.json", "utf8"));
const done = db.games.filter(g => g.completed || g.percent === 100);
profile.stats = {
  totalGames: profile.stats?.totalGames ?? db.games.length,
  perfectGames: done.length,
  achievementsInPerfectGames: done.reduce((a, g) => a + (g.unlockedAchievements || 0), 0)
};
profile.lastSync = db.lastSync;
await writeFile("data/profile.json", JSON.stringify(profile, null, 2));
console.log("OK: completados =", done.length);
