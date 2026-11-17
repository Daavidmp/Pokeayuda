'use strict';
/* PokéAyuda — datos de PokeAPI (pokeapi.co, empaquetados para funcionar sin conexión) */
const ART = (id) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
const TBG = ['#B8B78F','#C22E28','#A98FF3','#A33EA1','#E2BF65','#B6A136','#A6B91A','#735797','#B7B7CE','#EE8130','#6390F0','#7AC74C','#F7D02C','#F95587','#96D9D6','#6F35FC','#705746','#E6A0C4'];
const TFG = ['#151510','#FFFFFF','#120D22','#FFFFFF','#1A1408','#141005','#151A02','#FFFFFF','#12121A','#1A0C02','#0A1222','#0E1A06','#1A1502','#1A0810','#08201F','#FFFFFF','#FFFFFF','#1A0E14'];
const STAT_LABELS = ['PS','Ataque','Defensa','At. Esp.','Def. Esp.','Velocidad'];
const CLASS = ['Estado','Físico','Especial'];
const PER_SHEET = 160, COLS = 16, ROWS = 10;
// Habilidades que cambian el daño recibido: identificador -> {tipo: multiplicador}
const T_IDX = {normal:0,fighting:1,flying:2,poison:3,ground:4,rock:5,bug:6,ghost:7,steel:8,fire:9,water:10,grass:11,electric:12,psychic:13,ice:14,dragon:15,dark:16,fairy:17};
const DEF_AB = {
  'levitate':{ground:0},'earth-eater':{ground:0},'flash-fire':{fire:0},'well-baked-body':{fire:0},
  'water-absorb':{water:0},'storm-drain':{water:0},'dry-skin':{water:0,fire:1.25},
  'volt-absorb':{electric:0},'lightning-rod':{electric:0},'motor-drive':{electric:0},'sap-sipper':{grass:0},
  'thick-fat':{fire:.5,ice:.5},'heatproof':{fire:.5},'water-bubble':{fire:.5},'purifying-salt':{ghost:.5},'fluffy':{fire:2}
};
const SE_REDUCE = {'filter':.75,'solid-rock':.75,'prism-armor':.75};

let D = null, P = [], MV = {}, AB = {}, byId = {};
const S = {
  tab: 'search', q: '', type: -1, limit: 40,
  team: [], rival: null, rivalAb: null,
  stack: [], pq: '', ptype: -1, plimit: 40, mq: ''
};

/* ---------- utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const num = (p) => 'Nº ' + String(p.s).padStart(4, '0');
const tchip = (t, lg) => `<span class="t${lg ? ' lg' : ''}" style="background:${TBG[t]};color:${TFG[t]}">${esc(D.typesEs[t])}</span>`;
const fmtX = (m) => m === 0 ? '×0' : m === .25 ? '×¼' : m === .5 ? '×½' : m === 1 ? '×1' : '×' + (+m.toFixed(2));
function spr(idx, size) {
  const sh = Math.floor(idx / PER_SHEET), j = idx % PER_SHEET;
  const x = (j % COLS) / (COLS - 1) * 100, y = Math.floor(j / COLS) / (ROWS - 1) * 100;
  return `<span class="spr" role="img" aria-label="${esc(P[idx].n)}" style="width:${size}px;height:${size}px;background-image:url(img/s${sh}.webp);background-position:${x}% ${y}%"></span>`;
}
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2200);
}
const ICON = {
  search: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  team: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 19c0-3 3-5 6-5s6 2 6 5M15 14.5c3 0 6 1.5 6 4.5"/></svg>',
  fight: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 19L19 5M14 5h5v5M5 5l5 5M14 14l5 5M19 14v5h-5"/></svg>',
  back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  plus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  warn: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0;margin-top:2px"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/></svg>',
  check: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0;margin-top:2px"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>',
  chev: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9AA0B4" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>'
};

/* ---------- guardado ---------- */
function save() {
  try { localStorage.setItem('pokeayuda', JSON.stringify({ team: S.team.map((m) => ({ id: P[m.p].id, ab: m.ab, mv: m.mv, active: m.active })), rival: S.rival == null ? null : P[S.rival].id, rivalAb: S.rivalAb })); } catch (e) {}
}
function load() {
  try {
    const o = JSON.parse(localStorage.getItem('pokeayuda') || 'null'); if (!o) return;
    S.team = (o.team || []).filter((m) => byId[m.id] != null).map((m) => ({ p: byId[m.id], ab: m.ab, mv: (m.mv || [null, null, null, null]).slice(0, 4), active: !!m.active }));
    if (o.rival != null && byId[o.rival] != null) { S.rival = byId[o.rival]; S.rivalAb = o.rivalAb ?? null; }
  } catch (e) {}
}

/* ---------- cálculos de tipos y daño ---------- */
function typeMult(atk, types) { let m = 1; for (const t of types) m *= D.chart[atk][t]; return m; }
function abilityKey(abId) { return abId != null && AB[abId] ? AB[abId][1] : ''; }
function recvMult(atkType, p, abId) {
  let m = typeMult(atkType, P[p].t);
  const k = abilityKey(abId);
  if (k === 'wonder-guard' && m <= 1) return 0;
  const tbl = DEF_AB[k];
  if (tbl) for (const [tn, f] of Object.entries(tbl)) if (T_IDX[tn] === atkType) m *= f;
  if (SE_REDUCE[k] && m > 1) m *= SE_REDUCE[k];
  return m;
}
function weakTable(p, abId) {
  const g = {};
  for (let t = 0; t < 18; t++) { const m = recvMult(t, p, abId); (g[m] = g[m] || []).push(t); }
  return g;
}
const st50 = (b, i) => i === 0 ? b + 75 : b + 20; // nivel 50, IV 31, sin EV
function dmgPct(atkP, atkAb, power, cls, mtype, defP, defAb) {
  const A = P[atkP].b, B = P[defP].b;
  let a = cls === 1 ? st50(A[1], 1) : st50(A[3], 3);
  const d = cls === 1 ? st50(B[2], 2) : st50(B[4], 4);
  const ak = abilityKey(atkAb);
  if (cls === 1 && (ak === 'huge-power' || ak === 'pure-power')) a *= 2;
  const eff = recvMult(mtype, defP, defAb);
  let stab = P[atkP].t.includes(mtype) ? (ak === 'adaptability' ? 2 : 1.5) : 1;
  let dmg = (Math.floor(22 * power * a / d / 50) + 2) * stab * eff * 0.925;
  if (ak === 'tinted-lens' && eff > 0 && eff < 1) dmg *= 2;
  return { pct: dmg / st50(B[0], 0) * 100, eff };
}
// Mejor ataque del Pokémon atacante contra el defensor
function bestMove(atkP, atkAb, moves, defP, defAb) {
  let best = null;
  const list = (moves || []).filter((m) => m != null && MV[m] && MV[m][3] > 0 && MV[m][2] > 0);
  let assumed = false;
  if (!list.length) assumed = true;
  const cands = assumed
    ? P[atkP].t.map((t) => ({ name: 'Ataque ' + D.typesEs[t], type: t, power: 80, cls: P[atkP].b[1] >= P[atkP].b[3] ? 1 : 2 }))
    : list.map((m) => ({ name: MV[m][0], type: MV[m][1], power: MV[m][2], cls: MV[m][3], acc: MV[m][4] }));
  for (const c of cands) {
    const r = dmgPct(atkP, atkAb, c.power, c.cls, c.type, defP, defAb);
    const acc = c.acc ? Math.min(c.acc, 100) / 100 : 1;
    const val = r.pct * (0.6 + 0.4 * acc);
    if (!best || val > best.val) best = { ...c, ...r, val, assumed };
  }
  return best;
}
// Amenaza del rival: suponemos ataques de su tipo con potencia 90
function rivalThreat(rp, rab, myP, myAb) {
  const cls = P[rp].b[1] >= P[rp].b[3] ? 1 : 2;
  let best = null;
  for (const t of P[rp].t) {
    const r = dmgPct(rp, rab, 90, cls, t, myP, myAb);
    if (!best || r.pct > best.pct) best = { ...r, type: t };
  }
  return best;
}
function matchup(m, rp, rab, switching) {
  const mine = bestMove(m.p, m.ab, m.mv, rp, rab);
  const theirs = rivalThreat(rp, rab, m.p, m.ab);
  const mySpe = P[m.p].b[5], rSpe = P[rp].b[5];
  const faster = mySpe > rSpe ? 1 : mySpe === rSpe ? 0.5 : 0;
  const nMe = mine.pct > 0 ? Math.ceil(100 / Math.min(mine.pct, 100)) : 99;
  let theirPct = theirs.pct;
  let nThem = theirPct > 0 ? Math.ceil(100 / Math.min(theirPct, 100)) : 99;
  let effThem = nThem;
  if (switching) effThem = theirPct >= 100 ? 0 : Math.ceil((100 - theirPct) / Math.max(theirPct, 0.01));
  if (switching && theirPct <= 0) effThem = 99;
  const wins = faster >= 1 ? nMe <= effThem : nMe < effThem;
  let score = 50 + 14 * (Math.min(effThem, 6) - Math.min(nMe, 6)) + (faster === 1 ? 8 : faster === 0 ? -8 : 0);
  if (wins) score = Math.max(score, 56); else score = Math.min(score, 49);
  score = Math.round(Math.max(2, Math.min(98, score)));
  return { mine, theirs, faster, nMe, nThem, wins, score };
}

/* ---------- vistas ---------- */
function filterPokemon(q, type) {
  const nq = norm(q.trim());
  const isNum = /^\d+$/.test(nq);
  const out = [];
  for (let i = 0; i < P.length; i++) {
    const p = P[i];
    if (type >= 0 && !p.t.includes(type)) continue;
    if (nq) {
      if (isNum) { if (String(p.s) !== String(+nq) && !String(p.s).startsWith(nq)) continue; }
      else if (!p._n.includes(nq)) continue;
    }
    out.push(i);
  }
  if (nq && !isNum) out.sort((a, b) => (P[a]._n.startsWith(nq) ? 0 : 1) - (P[b]._n.startsWith(nq) ? 0 : 1) || P[a].s - P[b].s || P[a].id - P[b].id);
  return out;
}
function pokeRow(i, act) {
  const p = P[i];
  return `<button class="row" data-act="${act}" data-i="${i}"><span class="box">${spr(i, 58)}</span>
    <span class="info"><span class="nm">${esc(p.n)}<span class="num">${num(p)}</span></span><span class="types">${p.t.map((t) => tchip(t)).join('')}</span></span>${ICON.chev}</button>`;
}
function typeChips(cur, act) {
  return `<div class="chips"><button class="chip${cur < 0 ? ' on' : ''}" data-act="${act}" data-t="-1">Todos</button>${D.typesEs.map((n, t) => `<button class="chip${cur === t ? ' on' : ''}" data-act="${act}" data-t="${t}">${esc(n)}</button>`).join('')}</div>`;
}
function viewSearch() {
  const res = filterPokemon(S.q, S.type);
  return `<div class="screen">
    <div class="top"><h1>Poké<span>Ayuda</span></h1><span class="muted small">${P.length.toLocaleString('es')} Pokémon</span></div>
    ${installBanner()}
    <label class="search">${ICON.search.replace('currentColor', '#9AA0B4')}<input id="q" type="search" placeholder="Nombre o número" autocomplete="off" value="${esc(S.q)}" aria-label="Buscar Pokémon"></label>
    ${typeChips(S.type, 'stype')}
    <div class="label">${res.length ? res.length + ' resultados' : 'Sin resultados'}</div>
    <div class="list" id="results">${res.slice(0, S.limit).map((i) => pokeRow(i, 'detail')).join('')}</div>
    ${res.length > S.limit ? '<button class="btn ghost more" data-act="more">Ver más</button>' : ''}
  </div>`;
}
function weakCard(p, abId) {
  const g = weakTable(p, abId);
  const groups = [[4, '×4', 'Muy débil', 'vbad'], [2, '×2', 'Débil', 'bad'], [0.5, '×½', 'Resiste', 'good'], [0.25, '×¼', 'Resiste mucho', 'good'], [0, '×0', 'Inmune', 'imm']];
  const extra = Object.keys(g).map(Number).filter((m) => m !== 1 && !groups.some((x) => x[0] === m));
  let html = '';
  for (const [m, x, l, c] of groups) if (g[m]) html += `<div class="mrow"><span class="mx ${c}">${x}</span><div><div class="small muted" style="font-weight:600;margin-bottom:6px">${l}</div><div class="types">${g[m].map((t) => tchip(t)).join('')}</div></div></div>`;
  for (const m of extra) html += `<div class="mrow"><span class="mx ${m > 1 ? 'bad' : 'good'}">${fmtX(m)}</span><div class="types">${g[m].map((t) => tchip(t)).join('')}</div></div>`;
  return html;
}
function viewDetail(i) {
  const p = P[i];
  const tot = p.b.reduce((a, b) => a + b, 0);
  const col = (v) => v >= 120 ? '#22C58B' : v >= 90 ? '#8BD45A' : v >= 60 ? '#F5B731' : '#FF6B5E';
  const offense = []; // tipos a los que sus ataques del mismo tipo pegan ×2
  for (let d = 0; d < 18; d++) if (p.t.some((t) => D.chart[t][d] > 1)) offense.push(d);
  const abNote = p.a.map(([a]) => abilityKey(a)).filter((k) => DEF_AB[k] || k === 'wonder-guard' || SE_REDUCE[k]);
  const inTeam = S.team.some((m) => m.p === i);
  return `<div class="screen">
    <div class="top"><button class="iconbtn" data-act="back" aria-label="Volver">${ICON.back}</button><span class="muted" style="font-weight:600">${num(p)}</span><span style="width:44px"></span></div>
    <div class="hero"><div class="halo">${spr(i, 170)}<img src="${ART(p.id)}" alt="" onerror="this.remove()" loading="lazy"></div>
      <h1>${esc(p.n)}</h1><div class="types">${p.t.map((t) => tchip(t, 1)).join('')}</div>
      <div class="small muted">Altura ${(p.h / 10).toLocaleString('es')} m · Peso ${(p.w / 10).toLocaleString('es')} kg</div></div>
    <section class="card"><div class="hd"><h2>Estadísticas base</h2><span class="small muted">Total <b style="color:var(--tx)">${tot}</b></span></div>
      ${p.b.map((v, k) => `<div class="stat"><span class="small muted" style="font-weight:600">${STAT_LABELS[k]}</span><b>${v}</b><div class="bar"><i style="width:${Math.min(100, v / 180 * 100)}%;background:${col(v)}"></i></div></div>`).join('')}
    </section>
    <section class="card"><h2>Daño que recibe</h2>${weakCard(i, null)}
      ${abNote.length ? `<div class="small muted">Ojo: con ${p.a.filter(([a]) => abNote.includes(abilityKey(a))).map(([a]) => '<b style="color:var(--tx)">' + esc(AB[a][0]) + '</b>').join(' o ')} esto cambia (la app lo tiene en cuenta en tu equipo y en combate).</div>` : ''}
    </section>
    <section class="card"><h2>Sus ataques de tipo ${p.t.map((t) => esc(D.typesEs[t])).join('/')} pegan ×2 a</h2><div class="types">${offense.length ? offense.map((t) => tchip(t)).join('') : '<span class="muted">Ningún tipo</span>'}</div></section>
    <section class="card"><h2>Habilidades</h2>${p.a.map(([a, h]) => `<div class="ab"><span style="font-weight:600">${esc(AB[a][0])}${h ? '<span class="tag">OCULTA</span>' : ''}</span><span class="small muted">${esc(AB[a][2] || '')}</span></div>`).join('')}</section>
    <div style="display:flex;flex-direction:column;gap:10px">
      <button class="btn" data-act="addteam" data-i="${i}">${ICON.plus}${inTeam ? 'Añadir otro al equipo' : 'Añadir a mi equipo'}</button>
      <button class="btn ghost" data-act="setrival" data-i="${i}">Usar como rival en Combate</button>
    </div>
  </div>`;
}
function teamWeak() {
  const rows = [];
  for (let t = 0; t < 18; t++) {
    let w = 0, r = 0;
    for (const m of S.team) { const x = recvMult(t, m.p, m.ab); if (x > 1) w++; else if (x < 1) r++; }
    rows.push({ t, w, r });
  }
  return rows;
}
function teamCoverage() {
  const hit = new Set();
  for (const m of S.team) for (const mv of m.mv) if (mv != null && MV[mv] && MV[mv][3] > 0) for (let d = 0; d < 18; d++) if (D.chart[MV[mv][1]][d] > 1) hit.add(d);
  const any = S.team.some((m) => m.mv.some((x) => x != null && MV[x] && MV[x][3] > 0));
  return any ? [...Array(18).keys()].filter((d) => !hit.has(d)) : null;
}
function memberCard(m, k) {
  const p = P[m.p];
  return `<button class="member${m.active ? ' on' : ''}" data-act="member" data-k="${k}"><span class="box">${spr(m.p, 52)}</span>
    <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
      <span style="display:flex;align-items:baseline;gap:8px;min-width:0"><span class="gro" style="font-size:16px;font-weight:600;white-space:nowrap">${esc(p.n)}</span>
      <span class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.ab != null && AB[m.ab] ? esc(AB[m.ab][0]) : ''}</span>
      ${m.active ? '<span class="small" style="margin-left:auto;font-weight:700;color:var(--ac);white-space:nowrap">EN CAMPO</span>' : ''}</span>
      <span class="moves">${m.mv.map((x) => x != null && MV[x] ? `<span class="t" style="background:${TBG[MV[x][1]]};color:${TFG[MV[x][1]]}">${esc(MV[x][0])}</span>` : '<span class="t empty">— vacío —</span>').join('')}</span>
    </span></button>`;
}
function viewTeam() {
  const tw = teamWeak().filter((r) => r.w >= 2 && r.w > r.r).sort((a, b) => b.w - a.w);
  const cov = teamCoverage();
  return `<div class="screen">
    <div class="top"><h1>Mi equipo</h1><span class="muted small" style="font-weight:600">${S.team.length} / 6</span></div>
    ${S.team.length ? `<section class="card" style="padding:14px 16px;gap:8px">
      <div class="label" style="margin:0">Puntos flojos del equipo</div>
      <div class="types">${tw.length ? tw.map((r) => `<span class="t" style="background:${TBG[r.t]};color:${TFG[r.t]}">${esc(D.typesEs[r.t])} · ${r.w}</span>`).join('') : '<span class="small" style="color:var(--good)">Ningún tipo amenaza a 2 o más de tu equipo</span>'}</div>
      ${cov ? `<div class="label" style="margin:6px 0 0">Ningún ataque tuyo pega ×2 a</div><div class="types">${cov.length ? cov.map((t) => tchip(t)).join('') : '<span class="small" style="color:var(--good)">¡Cubres todos los tipos!</span>'}</div>` : ''}
    </section>` : '<p class="note">Añade hasta 6 Pokémon. Toca cada uno para elegir su habilidad y sus 4 ataques, y marca cuál tienes en campo.</p>'}
    <div class="list">${S.team.map(memberCard).join('')}
    ${S.team.length < 6 ? `<button class="empty-slot" data-act="pickteam">${ICON.plus}Añadir Pokémon</button>` : ''}</div>
  </div>`;
}
function viewMember(k) {
  const m = S.team[k]; if (!m) return '';
  const p = P[m.p];
  return `<div class="screen">
    <div class="top"><button class="iconbtn" data-act="back" aria-label="Volver">${ICON.back}</button><span class="gro" style="font-weight:600;font-size:18px">Editar</span><span style="width:44px"></span></div>
    <div style="display:flex;gap:14px;align-items:center;margin-bottom:16px"><span class="box" style="width:84px;height:84px">${spr(m.p, 76)}</span>
      <div style="display:flex;flex-direction:column;gap:6px"><span class="gro" style="font-size:24px;font-weight:700">${esc(p.n)}</span><span class="types">${p.t.map((t) => tchip(t)).join('')}</span></div></div>
    <section class="card"><h2>Habilidad</h2><div class="seg">${p.a.map(([a, h]) => `<button class="${m.ab === a ? 'on' : ''}" data-act="ab" data-a="${a}">${esc(AB[a][0])}${h ? ' ·&nbsp;oculta' : ''}</button>`).join('')}</div></section>
    <section class="card"><h2>Ataques</h2>${[0, 1, 2, 3].map((s) => {
      const x = m.mv[s];
      return `<button class="slot" data-act="pickmove" data-s="${s}">${x != null && MV[x]
        ? `<span class="t" style="background:${TBG[MV[x][1]]};color:${TFG[MV[x][1]]}">${esc(D.typesEs[MV[x][1]])}</span><span style="flex:1;font-weight:600">${esc(MV[x][0])}</span><span class="small muted">${CLASS[MV[x][3]]}${MV[x][2] ? ' · ' + MV[x][2] : ''}</span>`
        : `<span class="muted" style="flex:1">Ataque ${s + 1}: toca para elegir</span>`}</button>`;
    }).join('')}</section>
    <div style="display:flex;flex-direction:column;gap:10px">
      <button class="btn" data-act="activate">${m.active ? 'Está en campo ✓' : 'Poner en campo'}</button>
      <button class="btn ghost" data-act="detail" data-i="${m.p}">Ver ficha</button>
      <button class="btn ghost" data-act="remove" style="color:#FFB4AE">Quitar del equipo</button>
    </div>
  </div>`;
}
function tone(s) { return s >= 56 ? 'good' : s >= 45 ? 'mid' : 'bad'; }
function viewFight() {
  const act = S.team.findIndex((m) => m.active);
  const A = act >= 0 ? S.team[act] : null;
  let body = '';
  if (!S.team.length) body = `<p class="note">Primero monta tu equipo en la pestaña <b>Mi equipo</b>.</p><button class="btn" data-act="tab" data-tab="team">Ir a Mi equipo</button>`;
  else if (S.rival == null) body = `<p class="note">Elige el Pokémon rival y te digo cuál de tu equipo conviene usar y con qué ataque.</p><button class="btn" data-act="pickrival">Elegir rival</button>`;
  else {
    const rp = S.rival, rab = S.rivalAb;
    const res = S.team.map((m, k) => ({ k, m, r: matchup(m, rp, rab, !m.active) }));
    const ranked = [...res].sort((a, b) => b.r.score - a.r.score);
    let alert = '';
    if (A) {
      const cur = res[act].r;
      const others = res.filter((x) => x.k !== act).sort((a, b) => b.r.score - a.r.score);
      const sw = others[0];
      const threatName = D.typesEs[cur.theirs.type];
      if (cur.wins && (!sw || cur.score >= sw.r.score - 10)) {
        alert = `<div class="alert ok">${ICON.check}<div><b>Quédate con ${esc(P[A.p].n)}</b>Usa <b style="display:inline;font-size:13px">${esc(cur.mine.name)}</b> (${fmtX(cur.mine.eff)}, ~${Math.round(Math.min(cur.mine.pct, 999))}% de vida). ${cur.faster === 1 ? 'Eres más rápido.' : cur.faster === 0 ? 'Él es más rápido, pero aguantas.' : 'Misma velocidad.'}</div></div>`;
      } else if (sw && sw.r.score > cur.score) {
        const s = sw.r;
        alert = `<div class="alert">${ICON.warn}<div><b>Cambia a ${esc(P[sw.m.p].n)}</b>${esc(P[A.p].n)} recibe ${fmtX(cur.theirs.eff)} de ${esc(threatName)} (~${Math.round(Math.min(cur.theirs.pct, 999))}% por golpe). ${esc(P[sw.m.p].n)} recibe ${fmtX(s.theirs.eff)} y responde con <b style="display:inline;font-size:13px">${esc(s.mine.name)}</b> ${fmtX(s.mine.eff)}.</div></div>`;
      } else {
        alert = `<div class="alert">${ICON.warn}<div><b>Ataca con ${esc(cur.mine.name)}</b>Ningún cambio mejora la situación. Hace ${fmtX(cur.mine.eff)} (~${Math.round(Math.min(cur.mine.pct, 999))}% de vida).</div></div>`;
      }
    } else alert = `<div class="alert ok">${ICON.check}<div><b>Mejor opción: ${esc(P[ranked[0].m.p].n)}</b>Marca en la fila de arriba quién tienes en campo para que te diga si cambiar.</div></div>`;
    const rAbs = P[rp].a;
    body = `
    <div class="label" style="margin-top:0">¿Quién tienes en campo?</div>
    <div class="strip">${S.team.map((m, k) => `<button class="${m.active ? 'on' : ''}" data-act="setactive" data-k="${k}" aria-label="${esc(P[m.p].n)}">${spr(m.p, 52)}</button>`).join('')}</div>
    <div class="vs">
      <div class="fighter me"><span class="who">TÚ</span>${A ? spr(A.p, 84) + `<span class="gro" style="font-weight:600">${esc(P[A.p].n)}</span><span class="small muted">Vel. ${P[A.p].b[5]}</span>` : '<span class="muted small" style="margin:auto">Elige arriba</span>'}</div>
      <span class="x">VS</span>
      <button class="fighter" data-act="pickrival"><span class="who">RIVAL</span>${spr(rp, 84)}<span class="gro" style="font-weight:600;font-size:16px">${esc(P[rp].n)}</span><span class="small muted">Vel. ${P[rp].b[5]} · Cambiar</span></button>
    </div>
    ${alert}
    <section class="card" style="gap:10px"><div class="hd"><h2>${esc(P[rp].n)}</h2><span class="types">${P[rp].t.map((t) => tchip(t)).join('')}</span></div>
      <div class="small muted" style="font-weight:600">Habilidad del rival</div>
      <div class="seg"><button class="${rab == null ? 'on' : ''}" data-act="rab" data-a="">No sé</button>${rAbs.map(([a]) => `<button class="${rab === a ? 'on' : ''}" data-act="rab" data-a="${a}">${esc(AB[a][0])}</button>`).join('')}</div>
      ${weakCard(rp, rab)}
      ${['multiscale', 'shadow-shield'].includes(abilityKey(rab)) ? '<div class="small muted">Con vida completa recibe la mitad de daño del primer golpe: rómpelo con un ataque rápido o un golpe fuerte antes.</div>' : ''}
      ${abilityKey(rab) === 'intimidate' ? '<div class="small muted">Al entrar baja el Ataque de tu Pokémon: mejor usar ataques especiales.</div>' : ''}
    </section>
    <div class="label">Tu equipo contra ${esc(P[rp].n)}</div>
    <div class="list">${ranked.map((x, n) => {
      const r = x.r;
      const why = `${esc(r.mine.name)} ${fmtX(r.mine.eff)} (~${Math.round(Math.min(r.mine.pct, 999))}%) · recibe ${fmtX(r.theirs.eff)} (~${Math.round(Math.min(r.theirs.pct, 999))}%) · ${r.faster === 1 ? 'más rápido' : r.faster === 0 ? 'más lento' : 'empate vel.'}`;
      return `<div class="rank"><span class="pos">${n + 1}</span>${spr(x.m.p, 48)}<div style="min-width:0"><div style="font-weight:600">${esc(P[x.m.p].n)}${x.m.active ? ' <span class="small" style="color:var(--ac);font-weight:700">EN CAMPO</span>' : ''}</div><div class="small muted">${why}</div></div><span class="score ${tone(r.score)}">${r.score}</span></div>`;
    }).join('')}</div>
    <p class="note" style="margin-top:12px">Cálculo aproximado a nivel 50: tus ataques elegidos contra los ataques del tipo del rival (potencia 90). Si a un Pokémon no le has puesto ataques, se suponen ataques de su tipo. Para los que no están en campo se cuenta el golpe que reciben al entrar.</p>`;
  }
  return `<div class="screen"><div class="top"><h1>Combate</h1></div>${body}</div>`;
}
function viewPick(mode) {
  const res = filterPokemon(S.pq, S.ptype);
  return `<div class="sheet-bg" data-act="closesheet"><div class="sheet" role="dialog" aria-label="Elegir Pokémon">
    <div class="hd"><h3>${mode === 'rival' ? 'Elige el rival' : 'Añadir al equipo'}</h3><button class="iconbtn" data-act="back" aria-label="Cerrar">${ICON.close}</button></div>
    <label class="search">${ICON.search.replace('currentColor', '#9AA0B4')}<input id="pq" type="search" placeholder="Nombre o número" autocomplete="off" value="${esc(S.pq)}" aria-label="Buscar Pokémon"></label>
    ${typeChips(S.ptype, 'ptype')}
    <div class="scroll" id="presults">${res.slice(0, S.plimit).map((i) => pokeRow(i, mode === 'rival' ? 'choserival' : 'choseteam')).join('')}
    ${res.length > S.plimit ? '<button class="btn ghost more" data-act="pmore">Ver más</button>' : ''}</div>
  </div></div>`;
}
function viewMoves(k, slot) {
  const m = S.team[k]; const p = P[m.p];
  const nq = norm(S.mq.trim());
  let ids = p.m.filter((id) => MV[id] && (!nq || norm(MV[id][0]).includes(nq) || norm(D.typesEs[MV[id][1]]).includes(nq)));
  ids.sort((a, b) => (MV[b][3] > 0) - (MV[a][3] > 0) || (p.t.includes(MV[b][1])) - (p.t.includes(MV[a][1])) || MV[b][2] - MV[a][2] || MV[a][0].localeCompare(MV[b][0]));
  return `<div class="sheet-bg" data-act="closesheet"><div class="sheet" role="dialog" aria-label="Elegir ataque">
    <div class="hd"><h3>Ataque ${slot + 1} de ${esc(p.n)}</h3><button class="iconbtn" data-act="back" aria-label="Cerrar">${ICON.close}</button></div>
    <label class="search">${ICON.search.replace('currentColor', '#9AA0B4')}<input id="mq" type="search" placeholder="Buscar ataque o tipo" autocomplete="off" value="${esc(S.mq)}" aria-label="Buscar ataque"></label>
    <div class="scroll">${m.mv[slot] != null ? '<button class="mvopt" data-act="chosemove" data-m=""><span style="font-weight:600;color:#FFB4AE">Dejar vacío</span></button>' : ''}
    ${ids.map((id) => { const v = MV[id]; return `<button class="mvopt" data-act="chosemove" data-m="${id}"><span style="font-weight:600">${esc(v[0])}</span><span class="t" style="background:${TBG[v[1]]};color:${TFG[v[1]]}">${esc(D.typesEs[v[1]])}</span><span class="meta">${CLASS[v[3]]}${v[2] ? ' · Potencia ' + v[2] : ''}${v[4] ? ' · Precisión ' + v[4] : ''}${p.t.includes(v[1]) && v[3] > 0 ? ' · <b style="color:var(--good)">mismo tipo</b>' : ''}</span></button>`; }).join('') || '<p class="muted">No hay ataques con ese nombre.</p>'}</div>
  </div></div>`;
}

/* ---------- instalación ---------- */
let deferredPrompt = null;
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
function installBanner() {
  if (isStandalone()) return '';
  try { if (localStorage.getItem('pa-hide-install')) return ''; } catch (e) {}
  if (deferredPrompt) return `<div class="install"><span style="flex:1">Instala PokéAyuda en tu móvil para usarla como una app, también sin conexión.</span><button class="btn" data-act="install">Instalar</button></div>`;
  if (isIOS && location.protocol === 'https:' && 'serviceWorker' in navigator) return `<div class="install"><span style="flex:1">Para instalarla: pulsa <b>Compartir</b> y luego <b>Añadir a pantalla de inicio</b>.</span><button class="iconbtn" data-act="hideinstall" aria-label="Ocultar">${ICON.close}</button></div>`;
  return '';
}
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; if (S.tab === 'search' && !S.stack.length) render(); });

/* ---------- render ---------- */
function render() {
  const app = $('#app');
  const v = S.tab === 'search' ? viewSearch() : S.tab === 'team' ? viewTeam() : viewFight();
  const focusId = document.activeElement && document.activeElement.id;
  app.innerHTML = v + `<nav class="tabs">
    <button class="${S.tab === 'search' ? 'on' : ''}" data-act="tab" data-tab="search">${ICON.search}Buscar</button>
    <button class="${S.tab === 'team' ? 'on' : ''}" data-act="tab" data-tab="team">${ICON.team}Mi equipo</button>
    <button class="${S.tab === 'fight' ? 'on' : ''}" data-act="tab" data-tab="fight">${ICON.fight}Combate</button></nav>`;
  renderLayer();
  if (focusId === 'q' && $('#q')) { const q = $('#q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
}
function renderLayer() {
  const L = $('#layer');
  const focusId = document.activeElement && document.activeElement.id;
  L.innerHTML = S.stack.map((s) => {
    if (s.kind === 'detail') return `<div class="overlay">${viewDetail(s.i)}</div>`;
    if (s.kind === 'member') return `<div class="overlay">${viewMember(s.k)}</div>`;
    if (s.kind === 'pick') return viewPick(s.mode);
    if (s.kind === 'moves') return viewMoves(s.k, s.slot);
    return '';
  }).join('');
  document.body.style.overflow = S.stack.length ? 'hidden' : '';
  for (const id of ['pq', 'mq']) if (focusId === id && $('#' + id)) { const el = $('#' + id); el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
}
let HIST = true;
function push(s) {
  S.stack.push(s);
  if (HIST) { try { history.pushState({ d: S.stack.length }, ''); } catch (e) { HIST = false; } }
  renderLayer();
  const ov = $('#layer').lastElementChild; if (ov && ov.classList.contains('overlay')) ov.scrollTop = 0;
}
function pop() {
  if (!S.stack.length) return;
  if (HIST) history.back(); else { S.stack.pop(); render(); }
}
function popAll() {
  const n = S.stack.length; if (!n) return;
  S.stack = []; render();
  if (HIST) { S._ignore = n; history.go(-n); }
}
window.addEventListener('popstate', () => {
  if (S._ignore) { S._ignore = 0; return; }
  if (S.stack.length) { S.stack.pop(); render(); }
});

/* ---------- acciones ---------- */
function addToTeam(i) {
  if (S.team.length >= 6) { toast('Tu equipo ya tiene 6 Pokémon'); return false; }
  const p = P[i];
  S.team.push({ p: i, ab: p.a.length ? p.a[0][0] : null, mv: [null, null, null, null], active: !S.team.length });
  save(); toast(p.n + ' añadido al equipo'); return true;
}
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act;
  if (a === 'closesheet' && e.target !== el) return; // solo al tocar fuera de la hoja
  const top = S.stack[S.stack.length - 1];
  switch (a) {
    case 'tab': S.tab = el.dataset.tab; render(); window.scrollTo(0, 0); break;
    case 'stype': S.type = +el.dataset.t; S.limit = 40; render(); break;
    case 'ptype': S.ptype = +el.dataset.t; S.plimit = 40; renderLayer(); break;
    case 'more': S.limit += 60; render(); break;
    case 'pmore': S.plimit += 60; renderLayer(); break;
    case 'detail': push({ kind: 'detail', i: +el.dataset.i }); break;
    case 'back': case 'closesheet': pop(); break;
    case 'addteam': if (addToTeam(+el.dataset.i)) render(); break;
    case 'setrival': S.rival = +el.dataset.i; S.rivalAb = null; save(); S.tab = 'fight'; popAll(); render(); window.scrollTo(0, 0); break;
    case 'pickteam': S.pq = ''; S.ptype = -1; S.plimit = 40; push({ kind: 'pick', mode: 'team' }); break;
    case 'pickrival': S.pq = ''; S.ptype = -1; S.plimit = 40; push({ kind: 'pick', mode: 'rival' }); break;
    case 'choseteam': addToTeam(+el.dataset.i); pop(); break;
    case 'choserival': S.rival = +el.dataset.i; S.rivalAb = null; save(); pop(); break;
    case 'member': push({ kind: 'member', k: +el.dataset.k }); break;
    case 'ab': { const m = S.team[top.k]; m.ab = +el.dataset.a; save(); render(); break; }
    case 'pickmove': S.mq = ''; push({ kind: 'moves', k: top.k, slot: +el.dataset.s }); break;
    case 'chosemove': { const m = S.team[top.k]; m.mv[top.slot] = el.dataset.m === '' ? null : +el.dataset.m; save(); pop(); break; }
    case 'activate': S.team.forEach((m, k) => (m.active = k === top.k)); save(); render(); break;
    case 'setactive': { const k = +el.dataset.k; S.team.forEach((m, j) => (m.active = j === k)); save(); render(); break; }
    case 'remove': { const k = top.k; const wasActive = S.team[k].active; S.team.splice(k, 1); if (wasActive && S.team[0]) S.team[0].active = true; save(); pop(); break; }
    case 'rab': S.rivalAb = el.dataset.a === '' ? null : +el.dataset.a; save(); render(); break;
    case 'install': if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.finally(() => { deferredPrompt = null; render(); }); } break;
    case 'hideinstall': try { localStorage.setItem('pa-hide-install', '1'); } catch (er) {} render(); break;
  }
});
let tq;
document.addEventListener('input', (e) => {
  const id = e.target.id;
  if (id === 'q') { S.q = e.target.value; S.limit = 40; clearTimeout(tq); tq = setTimeout(() => {
    const res = filterPokemon(S.q, S.type);
    $('#results').innerHTML = res.slice(0, S.limit).map((i) => pokeRow(i, 'detail')).join('');
    $('.label').textContent = res.length ? res.length + ' resultados' : 'Sin resultados';
    const more = $('.more'); if (more) more.style.display = res.length > S.limit ? '' : 'none';
    else if (res.length > S.limit) $('#results').insertAdjacentHTML('afterend', '<button class="btn ghost more" data-act="more">Ver más</button>');
  }, 80); }
  if (id === 'pq') { S.pq = e.target.value; S.plimit = 40; clearTimeout(tq); tq = setTimeout(renderLayer, 80); }
  if (id === 'mq') { S.mq = e.target.value; clearTimeout(tq); tq = setTimeout(renderLayer, 80); }
});

/* ---------- arranque ---------- */
fetch('data.json').then((r) => r.json()).then((d) => {
  D = d; P = d.pokemon; MV = d.moves; AB = d.abilities;
  P.forEach((p, i) => { p._n = norm(p.n); byId[p.id] = i; });
  load(); render();
}).catch(() => { $('#app').innerHTML = '<div class="screen"><p>No se pudieron cargar los datos. Revisa la conexión y vuelve a abrir la app.</p></div>'; });
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
