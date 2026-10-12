// Sincroniza Steam -> data/games.json + data/profile.json
// Uso local: copia .env.example a .env con tu key y ejecuta `node scripts/sync.mjs`
import { writeFile, readFile } from "node:fs/promises";

try {
  const env = await readFile(".env", "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const API_KEY = process.env.STEAM_API_KEY;
const STEAM_ID = process.env.STEAM_ID || "76561198124408238";
if (!API_KEY) {
  console.error("Falta STEAM_API_KEY");
  process.exit(1);
}

async function get(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return r.json();
}

// 1. Juegos poseídos
const owned = await get(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${API_KEY}&steamid=${STEAM_ID}&include_appinfo=true&include_played_free_games=true&format=json`);
const games = owned.response?.games ?? [];
console.log(`Juegos: ${games.length}`);

// 2. Juego reciente (para última sesión)
let recentMap = {};
try {
  const rec = await get(`https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${API_KEY}&steamid=${STEAM_ID}&count=50&format=json`);
  for (const g of rec.response?.games ?? []) recentMap[g.appid] = g;
} catch (e) { console.warn("Sin recientes:", e.message); }

// 3. Logros por juego (con límite para no saturar: max 120 juegos con más horas)
const sorted = [...games].sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0));
const MAX_DETAIL = Number(process.env.MAX_GAMES || 120);
const out = [];

for (const [i, g] of sorted.slice(0, MAX_DETAIL).entries()) {
  console.log(`${i + 1}/${Math.min(sorted.length, MAX_DETAIL)} ${g.appid} ${g.name}`);
  let total = null, unlocked = null, percent = null, completed = false, achList = [];
  try {
    const schema = await get(`https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${API_KEY}&appid=${g.appid}&l=spanish`);
    const achs = schema.game?.availableGameStats?.achievements ?? [];
    total = achs.length || null;
    if (total) {
      const player = await get(`https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${g.appid}&key=${API_KEY}&steamid=${STEAM_ID}&l=spanish`);
      const pa = player.playerstats?.achievements ?? [];
      unlocked = pa.filter(a => a.achieved === 1).length;
      percent = total ? Math.round((unlocked / total) * 100) : 0;
      completed = percent === 100;
      const achMap = Object.fromEntries(pa.map(a => [a.apiname, a]));
      achList = achs.map(a => ({
        name: a.name,
        displayName: a.displayName,
        description: a.description || "",
        icon: a.icon,
        icongray: a.icongray,
        achieved: achMap[a.name]?.achieved === 1,
        unlocktime: achMap[a.name]?.unlocktime || 0
      }));
    }
  } catch (e) {
    // Juegos sin logros o privados -> se dejan en null
  }
  // Pequeña pausa para no hacer rate-limit
  await new Promise(r => setTimeout(r, 350));
  out.push({
    appid: g.appid,
    name: g.name,
    playtime_forever_min: g.playtime_forever || 0,
    playtime_2weeks_min: g.playtime_2weeks || 0,
    rtime_last_played: recentMap[g.appid]?.rtime_last_played || g.rtime_last_played || 0,
    img_icon_url: g.img_icon_url || "",
    totalAchievements: total,
    unlockedAchievements: unlocked,
    percent,
    completed,
    achievements: achList
  });
}

// Juegos restantes sin detalle de logros
for (const g of sorted.slice(MAX_DETAIL)) {
  out.push({
    appid: g.appid, name: g.name,
    playtime_forever_min: g.playtime_forever || 0,
    playtime_2weeks_min: g.playtime_2weeks || 0,
    rtime_last_played: g.rtime_last_played || 0,
    img_icon_url: g.img_icon_url || "",
    totalAchievements: null, unlockedAchievements: null, percent: null,
    completed: false, achievements: []
  });
}

// 4. Guardar, preservando overrides manuales y juegos extra si existen
let prev = { games: [] };
try { prev = JSON.parse(await readFile("data/games.json", "utf8")); } catch {}
const manualCompleted = new Set((prev.games || []).filter(g => g.manualCompleted).map(g => g.appid));
out.forEach(g => { if (manualCompleted.has(g.appid)) { g.completed = true; g.manualCompleted = true; } });

// Reincorporar juegos de data/extra.json (perfectos que GetOwnedGames no devuelve)
try {
  const extra = JSON.parse(await readFile("data/extra.json", "utf8"));
  const have = new Set(out.map(g => g.appid));
  const prevById = Object.fromEntries((prev.games || []).map(g => [g.appid, g]));
  for (const appid of extra.appids || []) {
    if (have.has(appid)) continue;
    if (prevById[appid]) { out.push(prevById[appid]); continue; }
    console.log("extra sin datos previos:", appid, "(ejecuta node scripts/merge-extra.mjs)");
  }
} catch {}

await writeFile("data/games.json", JSON.stringify({ lastSync: new Date().toISOString(), games: out }, null, 2));

// 5. Perfil
try {
  const sum = await get(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${API_KEY}&steamids=${STEAM_ID}`);
  const p = sum.response?.players?.[0];
  let profile = {};
  try { profile = JSON.parse(await readFile("data/profile.json", "utf8")); } catch {}
  profile.avatar = p?.avatarfull || profile.avatar;
  profile.personaname = p?.personaname || profile.personaname;
  profile.profileUrl = p?.profileurl || profile.profileUrl;
  profile.lastSync = new Date().toISOString();
  profile.stats = {
    totalGames: games.length,
    perfectGames: out.filter(g => g.completed).length,
    achievementsInPerfectGames: out.filter(g => g.completed).reduce((a, g) => a + (g.unlockedAchievements || 0), 0)
  };
  await writeFile("data/profile.json", JSON.stringify(profile, null, 2));
} catch (e) { console.warn("No se pudo actualizar perfil:", e.message); }

console.log("OK -> data/games.json");
