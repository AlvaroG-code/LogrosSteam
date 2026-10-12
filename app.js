let PROFILE = null, GAMES = [], BACKLOG = [];
let activeTab = "completed";

const $ = (s) => document.querySelector(s);

async function load() {
  const opts = { cache: "no-cache" };
  const [p, g, b] = await Promise.all([
    fetch("data/profile.json", opts).then(r => r.json()),
    fetch("data/games.json", opts).then(r => r.json()),
    fetch("data/backlog.json", opts).then(r => r.json()).catch(() => ({ backlog: [] }))
  ]);
  PROFILE = p;
  GAMES = g.games || [];
  BACKLOG = b.backlog || [];

  GAMES.forEach(game => {
    if (game.completed || game.percent === 100) game.status = "completed";
    else if ((game.playtime_forever_min || 0) === 0) game.status = "unstarted";
    else game.status = "playing";
  });

  renderHeader();
  render();
}

function renderHeader() {
  $("#avatar").src = PROFILE.avatar;
  $("#steam-link").href = PROFILE.profileUrl;
  const totalHours = GAMES.reduce((a, g) => a + (g.manualHours ? g.manualHours * 60 : (g.playtime_forever_min || 0)), 0) / 60;
  const totalAch = GAMES.reduce((a, g) => a + (g.unlockedAchievements || 0), 0);
  const completed = GAMES.filter(g => g.status === "completed").length;
  $("#stats").innerHTML = `
    <div class="stat"><b>🎮 ${PROFILE.stats?.totalGames ?? GAMES.length}</b><span>Juegos</span></div>
    <div class="stat"><b>🏆 ${completed}</b><span>Completados</span></div>
    <div class="stat"><b>🏅 ${totalAch}</b><span>Logros</span></div>
    <div class="stat"><b>⏱ ${Math.round(totalHours)} h</b><span>Jugadas</span></div>`;
  $("#last-sync").textContent = PROFILE.lastSync ? `· sync ${new Date(PROFILE.lastSync).toLocaleString()}` : "";
}

function fmtHours(g) {
  const mins = g.manualHours ? g.manualHours * 60 : (g.playtime_forever_min || 0);
  return (mins / 60).toFixed(1);
}

function completedDate(g) {
  const times = (g.achievements || []).filter(a => a.achieved && a.unlocktime).map(a => a.unlocktime);
  return times.length ? new Date(Math.max(...times) * 1000).toLocaleDateString() : null;
}

function sorter(mode) {
  const val = (g, f) => (g[f] ?? -1);
  if (mode === "hours") return (a, b) => val(b, "playtime_forever_min") - val(a, "playtime_forever_min");
  if (mode === "last") return (a, b) => val(b, "rtime_last_played") - val(a, "rtime_last_played");
  if (mode === "name") return (a, b) => a.name.localeCompare(b.name, "es");
  return (a, b) => val(b, "percent") - val(a, "percent") || val(b, "playtime_forever_min") - val(a, "playtime_forever_min");
}

function cover(g) {
  return g.img || `https://cdn.fastly.steamstatic.com/steam/apps/${g.appid}/header.jpg`;
}

function filtered() {
  const q = ($("#search").value || "").toLowerCase();
  const sort = sorter($("#sort").value);
  if (activeTab === "backlog") {
    return BACKLOG.filter(g => g.name.toLowerCase().includes(q)).map(g => ({ ...g, _backlog: true }));
  }
  return GAMES.filter(g => g.status === activeTab && g.name.toLowerCase().includes(q)).sort(sort);
}

function render() {
  const list = filtered();
  $("#count-completed").textContent = `(${GAMES.filter(g => g.status === "completed").length})`;
  $("#count-playing").textContent = `(${GAMES.filter(g => g.status === "playing").length})`;
  $("#count-backlog").textContent = `(${BACKLOG.length})`;

  $("#grid").innerHTML = list.map((g, i) => {
    if (g._backlog) {
      return `<div class="card" style="animation-delay:${Math.min(i * 30, 500)}ms">
        <div class="cover"><img loading="lazy" src="https://cdn.fastly.steamstatic.com/steam/apps/${g.appid}/header.jpg" onerror="this.style.display='none'" alt="" />${g.asus ? '<span class="pct">🎮 ASUS</span>' : ""}</div>
        <div class="card-body"><h3>${g.name}</h3><div class="meta"><span>${g.note || "en lista por jugar"}</span></div></div></div>`;
    }
    const hours = fmtHours(g);
    const last = g.rtime_last_played ? new Date(g.rtime_last_played * 1000).toLocaleDateString() : "—";
    const pct = g.percent ?? 0;
    return `<div class="card ${g.completed ? "done" : ""}" data-appid="${g.appid}" style="animation-delay:${Math.min(i * 30, 500)}ms">
      <div class="cover">
        <img loading="lazy" src="${cover(g)}" alt="${g.name}" onerror="this.style.display='none'" />
        <span class="pct">${g.totalAchievements ? `${g.unlockedAchievements}/${g.totalAchievements}` : `${pct}%`}</span>
      </div>
      <div class="card-body">
        <h3>${g.completed ? "🏆 " : ""}${g.name}</h3>
        <div class="meta"><span>⏱ ${hours} h</span><span>${pct}%</span><span>🕓 ${last}</span></div>
        <div class="bar ${pct === 100 ? "done" : ""}"><i style="width:${pct}%"></i></div>
      </div></div>`;
  }).join("") || `<p style="color:#93a4bd">Nada aquí todavía.</p>`;

  document.querySelectorAll(".card[data-appid]").forEach(c => {
    c.onclick = () => openModal(Number(c.dataset.appid));
  });
}

function openModal(appid) {
  const g = GAMES.find(x => x.appid === appid);
  if (!g) return;
  const hours = fmtHours(g);
  const last = g.rtime_last_played ? new Date(g.rtime_last_played * 1000).toLocaleString() : "—";
  const doneDate = completedDate(g);
  const ach = (g.achievements || []).map(a => `
    <div class="ach ${a.achieved ? "" : "locked"}">
      <img src="${a.achieved ? a.icon : (a.icongray || a.icon)}" alt="" loading="lazy" />
      <div><b>${a.displayName}</b><br/><span>${a.description || ""}</span><br/><small>${a.achieved ? "✅ " + new Date(a.unlocktime * 1000).toLocaleString() : "🔒 bloqueado"}</small></div>
    </div>`).join("") || "<p>Este juego no tiene logros o no se pudo leer el detalle.</p>";
  $("#modal-body").innerHTML = `
    <h2>${g.completed ? "🏆 " : ""}${g.name}</h2>
    <img class="hero-img" src="${cover(g)}" onerror="this.style.display='none'" />
    <div class="chips">
      <span class="chip">⏱ ${hours} h</span>
      <span class="chip">🏅 ${g.unlockedAchievements ?? "?"} / ${g.totalAchievements ?? "?"} (${g.percent ?? "?"}%)</span>
      <span class="chip">🕓 ${last}</span>
      ${g.completed && doneDate ? `<span class="chip gold">🏁 Completado el ${doneDate}</span>` : ""}
      ${g.completed && !doneDate ? '<span class="chip gold">100% COMPLETADO</span>' : ""}
    </div>
    <p><a href="https://store.steampowered.com/app/${g.appid}" target="_blank" rel="noopener">Ver en Steam ↗</a></p>
    <h3>Logros (${g.unlockedAchievements ?? "?"} / ${g.totalAchievements ?? "?"})</h3>${ach}`;
  $("#modal").classList.remove("hidden");
}

document.querySelectorAll(".tabs button[data-tab]").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".tabs button[data-tab]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeTab = btn.dataset.tab;
    render();
  };
});
$("#search").oninput = render;
$("#sort").onchange = render;
$("#modal-close").onclick = () => $("#modal").classList.add("hidden");
$("#modal").onclick = (e) => { if (e.target.id === "modal") $("#modal").classList.add("hidden"); };
document.onkeydown = (e) => { if (e.key === "Escape") $("#modal").classList.add("hidden"); };

function pickInfo(g) {
  const owned = GAMES.find(x => x.appid === g.appid);
  const extra = owned
    ? `<br/><small>⏱ ${fmtHours(owned)} h · ${owned.percent ?? "?"}% logros</small>`
    : `<br/><small>aún no empezado</small>`;
  return `<b>${g.name}</b>${g.note ? `<br/><small>${g.note}</small>` : ""}${extra}<br/><a href="https://store.steampowered.com/app/${g.appid}" target="_blank" rel="noopener">Ver en Steam ↗</a>`;
}

$("#btn-random").onclick = () => {
  if (!BACKLOG.length) {
    $("#random-result").classList.remove("hidden");
    $("#random-result").innerHTML = `Añade juegos en <code>data/backlog.json</code> para usar el random.`;
    return;
  }
  const main = BACKLOG[Math.floor(Math.random() * BACKLOG.length)];
  const asusPool = BACKLOG.filter(g => g.asus && g.appid !== main.appid);
  const asus = asusPool.length
    ? asusPool[Math.floor(Math.random() * asusPool.length)]
    : BACKLOG.find(g => g.asus);
  $("#random-result").classList.remove("hidden");
  $("#random-result").innerHTML = `🎯 <b>Principal:</b> ${pickInfo(main)}<br/><br/>🎮 <b>Para la ASUS:</b> ${asus ? pickInfo(asus) : "marca alguno con asus:true"}`;
};

$("#btn-refresh").onclick = async () => {  const st = $("#refresh-status");
  st.textContent = "actualizando...";
  try {
    const r = await fetch("/api/refresh");
    const j = await r.json();
    st.textContent = j.ok ? "actualizado, recargando..." : ("error: " + (j.error || "falló"));
    if (j.ok) setTimeout(() => location.reload(), 800);
  } catch {
    st.textContent = "abre la web con iniciar-web.bat para usar este botón";
  }
};

// En GitHub Pages no hay servidor local: ocultar el botón de actualizar
if (!["localhost", "127.0.0.1"].includes(location.hostname)) {
  const rb = document.getElementById("btn-refresh");
  if (rb) rb.style.display = "none";
}

load();
