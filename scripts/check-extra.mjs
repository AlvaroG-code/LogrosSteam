// Comprueba logros de appids que GetOwnedGames no devuelve (sin mostrar la key)
import { readFile } from "node:fs/promises";
try {
  const env = await readFile(".env", "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {}
const KEY = process.env.STEAM_API_KEY;
const ID = process.env.STEAM_ID;
const APPIDS = [1903340, 1888930, 731490, 1562430, 2062430, 50300];
for (const appid of APPIDS) {
  try {
    const pr = await fetch(`https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${appid}&key=${KEY}&steamid=${ID}&l=spanish`);
    const pj = await pr.json();
    const achs = pj.playerstats?.achievements ?? [];
    const un = achs.filter(a => a.achieved === 1).length;
    const sr = await fetch(`https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${KEY}&appid=${appid}&l=spanish`);
    const sj = await sr.json();
    const total = sj.game?.availableGameStats?.achievements?.length ?? "?";
    console.log(appid, sj.game?.gameName || "?", `-> ${un}/${total}`, `success:${pj.playerstats?.success}`);
  } catch (e) {
    console.log(appid, "ERROR", e.message);
  }
  await new Promise(r => setTimeout(r, 400));
}
