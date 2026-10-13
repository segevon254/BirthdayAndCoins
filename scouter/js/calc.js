/*
 * GMS Scouter — calculation engine. Pure functions, no DOM access.
 *
 * Units: the *state* stores values the way the in-game stat window shows them
 * (percent numbers like 300 for 300%). Everything inside this file works in
 * fractions (3.0 for 300%). A "delta" is a set of changes in fractions:
 *   { mainFlat, mainPct, mainUnaff, subFlat, attFlat, attPct, dmg, boss,
 *     ied: [..signed..], cr, cd, fd: [..signed..], sac, af, level }
 */
(function (root) {
  'use strict';
  const D = (typeof module !== 'undefined' && module.exports) ? require('./data.js') : root.MSData;

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  function defaultState() {
    return {
      version: 1,
      name: 'My Character',
      cls: 'hero',
      level: 285,
      mainStat: 60000, mainPct: 330, unaffOther: 2500, autoSymbol: true,
      arcane: 1320, sacred: 330, authSymbols: 6,
      subStat: 6000, subPct: 60,
      att: 4200, attPct: 95,
      dmg: 90, boss: 330, ied: 94, cr: 100, cd: 95, fd: 0,
      statIncludesFamiliars: true,
      familiars: JSON.parse(JSON.stringify(D.FAMILIAR_PRESETS.unique40.fams)),
      badges: { boss: 0, ied: 0, dmg: 0 },
      hyper: { main: 0, cr: 5, cd: 10, ied: 10, dmg: 10, boss: 10, att: 10 },
      hyperExtra: 0,
      legion: { boss: 40, ied: 40, cd: 40, cr: 0, main: 15, att: 15 },
      doping: { echo: true, xpot: false, guildboss: false, guildied: false, guilddmg: false, mvp: false, custom: false },
      dopingVals: {},
      useDoping: true,
      ring: { id: 'restraint', level: 4 }, weaponAtt: 700,
      burstShare: 45, burstLen: 20,
      hexa: JSON.parse(JSON.stringify(D.DEFAULT_HEXA)),
      useHexa: true,
      gear: JSON.parse(JSON.stringify(D.GEAR_DEFAULT)),
      classFactor: 1.0,
      calib: 1.0,
      calibNote: '',
      targetBoss: 'hkaling',
      refBoss: 'hseren',
      settings: {
        sfEvent30: false, sfBoomReduce: false, starCatch: true, mvp: 'none', keepOnBoom: false,
        sfPlan: { 15: '1', 16: '1', 17: '1', 18: '1', 19: '1', 20: '1', 21: '1' },
        cube: 'black', cubeCost: 22e6, famRerollCost: 10e6,
        fragPrice: 0, symbolCost: 0, hyperResetCost: 10e6, budget: 50e9,
      },
      custom: [],
      bossOverrides: {},
      customBosses: [],
    };
  }

  function mergeState(s) {
    const d = defaultState();
    const out = Object.assign({}, d, s || {});
    out.settings = Object.assign({}, d.settings, (s && s.settings) || {});
    out.doping = Object.assign({}, d.doping, (s && s.doping) || {});
    out.hyper = Object.assign({}, d.hyper, (s && s.hyper) || {});
    out.legion = Object.assign({}, d.legion, (s && s.legion) || {});
    out.badges = Object.assign({}, d.badges, (s && s.badges) || {});
    out.ring = Object.assign({}, d.ring, (s && s.ring) || {});
    if (s && s.settings && s.settings.safeguard && !s.settings.sfPlan) { [15, 16, 17].forEach((k) => { out.settings.sfPlan[k] = 'sg'; }); }
    delete out.settings.safeguard;
    return out;
  }

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const int0 = (n) => Math.round(n).toLocaleString('en-US');

  // ---------------------------------------------------------------------------
  // Bosses (with user overrides / custom bosses)
  // ---------------------------------------------------------------------------
  function bossList(state) {
    const list = D.BOSSES.map((b) => Object.assign({}, b, (state && state.bossOverrides && state.bossOverrides[b.id]) || {}));
    return list.concat((state && state.customBosses) || []);
  }
  function bossById(state, id) {
    return bossList(state).find((b) => b.id === id) || bossList(state)[0];
  }

  // ---------------------------------------------------------------------------
  // Delta helpers
  // ---------------------------------------------------------------------------
  function emptyDelta() {
    return { mainFlat: 0, mainPct: 0, mainUnaff: 0, subFlat: 0, attFlat: 0, attPct: 0, dmg: 0, boss: 0, ied: [], cr: 0, cd: 0, fd: [], sac: 0, af: 0, level: 0 };
  }
  function addDelta(a, b) {
    const o = emptyDelta();
    for (const k of Object.keys(o)) {
      if (Array.isArray(o[k])) o[k] = [].concat((a && a[k]) || [], (b && b[k]) || []);
      else o[k] = ((a && a[k]) || 0) + ((b && b[k]) || 0);
    }
    return o;
  }
  function negDelta(a) {
    const o = emptyDelta();
    for (const k of Object.keys(o)) {
      if (Array.isArray(o[k])) o[k] = ((a && a[k]) || []).map((x) => -x);
      else o[k] = -((a && a[k]) || 0);
    }
    return o;
  }
  function combineIed(base, list) {
    let rem = 1 - base;
    for (const x of list || []) {
      if (!x) continue;
      if (x > 0) rem *= (1 - x);
      else rem /= (1 + x); // remove a source of -x
    }
    return Math.min(1, Math.max(0, 1 - rem));
  }
  function combineFd(base, list) {
    let m = base;
    for (const x of list || []) {
      if (!x) continue;
      m = x > 0 ? m * (1 + x) : m / (1 - x);
    }
    return m;
  }

  // ---------------------------------------------------------------------------
  // Contributions from familiars, hyper stats, legion, doping
  // ---------------------------------------------------------------------------
  function familiarDelta(fams, badges) {
    const d = emptyDelta();
    let boss = 0;
    for (const f of fams || []) {
      for (const ln of (f && f.lines) || []) {
        const v = Number(ln.val) || 0;
        if (ln.type === 'boss') boss += v / 100;
        else if (ln.type === 'ied') d.ied.push(v / 100);
        else if (ln.type === 'dmg') d.dmg += v / 100;
        else if (ln.type === 'att') d.attFlat += v;
        else if (ln.type === 'cr') d.cr += v / 100;
        else if (ln.type === 'mainPct') d.mainPct += v / 100;
      }
    }
    d.boss = Math.min(boss, D.FAMILIAR_BOSS_CAP);
    if (badges) {
      d.boss += (Number(badges.boss) || 0) / 100;
      if (badges.ied) d.ied.push(badges.ied / 100);
      d.dmg += (Number(badges.dmg) || 0) / 100;
    }
    return d;
  }
  function familiarBossRaw(fams) {
    let boss = 0;
    for (const f of fams || []) for (const ln of f.lines || []) if (ln.type === 'boss') boss += (Number(ln.val) || 0) / 100;
    return boss;
  }

  function hyperDelta(h) {
    const d = emptyDelta();
    const S = D.HYPER_STATS;
    d.mainUnaff = S.main.per(h.main || 0);
    d.cr = S.cr.per(h.cr || 0);
    d.cd = S.cd.per(h.cd || 0);
    if (h.ied) d.ied.push(S.ied.per(h.ied));
    d.dmg = S.dmg.per(h.dmg || 0);
    d.boss = S.boss.per(h.boss || 0);
    d.attFlat = S.att.per(h.att || 0);
    return d;
  }
  function hyperCost(level) {
    let c = 0;
    for (let i = 0; i < level; i++) c += D.HYPER_COST[i];
    return c;
  }
  function hyperSpent(h) {
    return Object.keys(D.HYPER_STATS).reduce((s, k) => s + hyperCost(h[k] || 0), 0);
  }

  function legionDelta(l) {
    const d = emptyDelta();
    const R = D.LEGION_REGIONS;
    d.boss = (l.boss || 0) * R.boss.per;
    if (l.ied) d.ied.push(l.ied * R.ied.per);
    d.cd = (l.cd || 0) * R.cd.per;
    d.cr = (l.cr || 0) * R.cr.per;
    d.mainUnaff = (l.main || 0) * R.main.per;
    d.attFlat = (l.att || 0) * R.att.per;
    return d;
  }

  function dopingDelta(state) {
    const d = emptyDelta();
    if (!state.useDoping) return d;
    for (const it of D.DOPING) {
      if (!state.doping[it.id]) continue;
      const v = (state.dopingVals && state.dopingVals[it.id] != null) ? Number(state.dopingVals[it.id]) : it.val;
      if (it.stat === 'attPct') d.attPct += v / 100;
      else if (it.stat === 'attFlat') d.attFlat += v;
      else if (it.stat === 'boss') d.boss += v / 100;
      else if (it.stat === 'dmg') d.dmg += v / 100;
      else if (it.stat === 'ied') d.ied.push(v / 100);
    }
    return d;
  }

  function symbolStat(state) {
    const arc = (Number(state.arcane) || 0) * 10;
    const sac = (Number(state.sacred) || 0) * 20 + (Number(state.authSymbols) || 0) * 300;
    return arc + sac;
  }
  function unaffected(state) {
    return (Number(state.unaffOther) || 0) + (state.autoSymbol ? symbolStat(state) : 0);
  }

  // ---------------------------------------------------------------------------
  // Effective stats
  // ---------------------------------------------------------------------------
  function effective(state, extraDelta, opts) {
    opts = opts || {};
    let d = emptyDelta();
    if (!state.statIncludesFamiliars) d = addDelta(d, familiarDelta(state.familiars, state.badges));
    if (!opts.noDoping) d = addDelta(d, dopingDelta(state));
    if (extraDelta) d = addDelta(d, extraDelta);

    const pct = (Number(state.mainPct) || 0) / 100;
    const unaff = unaffected(state);
    const mainBase = Math.max(0, ((Number(state.mainStat) || 0) - unaff) / (1 + pct));
    const main = Math.max(0, (mainBase + d.mainFlat) * (1 + pct + d.mainPct) + unaff + d.mainUnaff);
    const sub = Math.max(0, (Number(state.subStat) || 0) + d.subFlat * (1 + (Number(state.subPct) || 0) / 100));
    const attPct = (Number(state.attPct) || 0) / 100;
    const attBase = (Number(state.att) || 0) / (1 + attPct);
    const att = Math.max(0, (attBase + d.attFlat) * (1 + attPct + d.attPct));
    const db = ((Number(state.dmg) || 0) + (Number(state.boss) || 0)) / 100 + d.dmg + d.boss;
    const ied = combineIed((Number(state.ied) || 0) / 100, d.ied);
    const crRaw = (Number(state.cr) || 0) / 100 + d.cr;
    const cr = Math.min(1, Math.max(0, crRaw));
    const cd = (Number(state.cd) || 0) / 100 + d.cd;
    const fd = combineFd(1 + (Number(state.fd) || 0) / 100, d.fd);
    return {
      main, sub, att, db, ied, cr, crRaw, cd, fd,
      level: (Number(state.level) || 0) + d.level,
      arcane: (Number(state.arcane) || 0) + d.af,
      sacred: (Number(state.sacred) || 0) + d.sac,
    };
  }

  // ---------------------------------------------------------------------------
  // Core damage formula
  // ---------------------------------------------------------------------------
  const REF = { att: 2000, db: 4.0, crit: 2.15, def: 0.7, pdr: 3.0 };
  const defMult = (pdr, ied) => Math.max(0, 1 - pdr * (1 - ied));
  const critMult = (S) => 1 + S.cr * (0.35 + S.cd);

  function rawScore(S) {
    const statVal = 4 * S.main + S.sub;
    return (statVal / 4) * (S.att / REF.att) * ((1 + S.db) / REF.db) * S.fd * (critMult(S) / REF.crit);
  }
  /** Scouter score: main-stat-equivalent damage vs a 300% PDR boss with force met. */
  function score(S) {
    return rawScore(S) * defMult(REF.pdr, S.ied) / REF.def;
  }

  function arcaneMult(af, req) {
    if (!req) return 1;
    const r = af / req;
    if (r >= 1.5) return 1.5;
    if (r >= 1.3) return 1.3;
    if (r >= 1.1) return 1.1;
    if (r >= 1.0) return 1.0;
    if (r >= 0.7) return 0.8;
    if (r >= 0.5) return 0.5;
    if (r >= 0.1) return 0.1;
    return 0.01;
  }
  function sacredMult(sac, req) {
    if (!req) return 1;
    const diff = sac - req;
    if (diff >= 0) return 1 + Math.min(5, Math.floor(diff / 10)) * 0.05;
    return Math.max(0.05, 1 + Math.floor(diff / 10) * 0.1);
  }
  function forceMult(S, boss) {
    if (boss.force === 'arc') return arcaneMult(S.arcane, boss.req);
    if (boss.force === 'sac') return sacredMult(S.sacred, boss.req);
    return 1;
  }
  function levelMult(playerLv, bossLv) {
    const d = playerLv - bossLv;
    if (d >= 0) return 1.1 + 0.02 * Math.min(5, d);
    return Math.max(0, 1.1 + 0.025 * d);
  }

  // ---------------------------------------------------------------------------
  // HEXA and seed ring multipliers
  // ---------------------------------------------------------------------------
  function hexaBaseline(kind) { return kind === 'origin' ? 1 : 0; }
  function hexaFactor(cores) {
    let shareSum = 0, base = 0;
    for (const c of cores || []) {
      const s = Math.max(0, Number(c.share) || 0) / 100;
      const cur = D.HEXA_CURVES[c.kind](Number(c.level) || 0);
      if (cur <= 0 || s <= 0) continue;
      shareSum += s;
      base += s * D.HEXA_CURVES[c.kind](hexaBaseline(c.kind)) / cur;
    }
    shareSum = Math.min(shareSum, 0.95);
    const baseline = (1 - shareSum) + base;
    return baseline > 0 ? 1 / baseline : 1;
  }
  /** Relative total-damage gain from raising core i by one level. */
  function hexaStepGain(core) {
    const L = Number(core.level) || 0;
    if (L >= 30) return 0;
    const s = Math.max(0, Number(core.share) || 0) / 100;
    const f = D.HEXA_CURVES[core.kind];
    const cur = f(L), next = f(L + 1);
    if (cur <= 0) return s > 0 && s < 1 ? s / (1 - s) : 0; // activating a new skill
    return s * (next / cur - 1);
  }
  function hexaStepCost(core) {
    const L = Number(core.level) || 0;
    if (L >= 30) return null;
    const t = D.HEXA_COSTS[core.kind];
    return { frag: t.frag[L + 1], erda: t.erda[L + 1] };
  }
  /** Greedy HEXA upgrade order by gain per fragment. */
  function hexaPlan(cores, steps) {
    const cs = clone(cores);
    const out = [];
    for (let i = 0; i < (steps || 20); i++) {
      let best = null;
      cs.forEach((c, idx) => {
        const cost = hexaStepCost(c);
        if (!cost) return;
        const g = hexaStepGain(c);
        if (g <= 0) return;
        const eff = g / cost.frag;
        if (!best || eff > best.eff) best = { idx, eff, gain: g, cost };
      });
      if (!best) break;
      const c = cs[best.idx];
      out.push({ name: c.name, from: c.level, to: c.level + 1, gain: best.gain, frag: best.cost.frag, erda: best.cost.erda });
      // renormalise shares: the upgraded core grows, others shrink proportionally
      const g = best.gain;
      cs.forEach((o, j) => {
        const s = (Number(o.share) || 0) / 100;
        if (j === best.idx) {
          const f = D.HEXA_CURVES[o.kind];
          const cur = f(o.level);
          const ns = cur <= 0 ? s : s * f(o.level + 1) / cur;
          o.share = 100 * ns / (1 + g);
        } else o.share = 100 * s / (1 + g);
      });
      c.level += 1;
    }
    return out;
  }

  /** Average damage multiplier from the equipped seed ring over a fight. */
  function ringFactor(state, S, extraDelta) {
    const r = D.SEED_RINGS[(state.ring && state.ring.id) || 'none'];
    const lv = Math.min(4, Math.max(1, Number(state.ring && state.ring.level) || 1));
    const dur = r && r.duration ? r.duration[lv - 1] : 0;
    if (!dur) return 1;
    const d = emptyDelta();
    if (r.attPct) d.attPct = r.attPct[lv - 1];
    if (r.boss) d.boss = r.boss[lv - 1];
    if (r.statOfWeapon) d.mainUnaff = r.statOfWeapon[lv - 1] * (Number(state.weaponAtt) || 0);
    const base = rawScore(S || effective(state, extraDelta));
    const mult = base > 0 ? rawScore(effective(state, addDelta(extraDelta, d))) / base : 1;
    let w;
    if (r.burstAligned) {
      const burstShare = (Number(state.burstShare) || 0) / 100;
      const burstLen = Math.max(1, Number(state.burstLen) || 20);
      w = burstShare * Math.min(1, dur / burstLen) * Math.min(1, 120 / r.cycle);
    } else w = Math.min(1, dur / (r.cycle || dur + (r.cooldownAfter || 0)));
    return 1 + w * (mult - 1);
  }
  function ringTable(state) {
    const out = [];
    for (const id of Object.keys(D.SEED_RINGS)) {
      if (id === 'none') continue;
      for (let lv = 1; lv <= 4; lv++) {
        const f = ringFactor(Object.assign({}, state, { ring: { id, level: lv } }));
        out.push({ id, label: D.SEED_RINGS[id].label, level: lv, gain: f - 1, approx: !!D.SEED_RINGS[id].approx });
      }
    }
    return out.sort((a, b) => b.gain - a.gain);
  }

  // ---------------------------------------------------------------------------
  // DPS / boss estimates
  // ---------------------------------------------------------------------------
  function hexaScore(state, S) {
    return score(S) * (state.useHexa ? hexaFactor(state.hexa) : 1);
  }
  function dps(state, boss, delta) {
    const S = effective(state, delta);
    const base = rawScore(S) * defMult(boss.pdr, S.ied) / REF.def;
    const hexa = state.useHexa ? hexaFactor(state.hexa) : 1;
    return base * hexa * ringFactor(state, S, delta) * forceMult(S, boss) * (levelMult(S.level, boss.level) / 1.1)
      * (Number(state.classFactor) || 1) * (Number(state.calib) || 1) * D.DPS_PER_SCORE;
  }
  function bossEstimate(state, boss, delta) {
    const v = dps(state, boss, delta);
    const S = effective(state, delta);
    const timeSec = boss.time * 60;
    const pct = v > 0 ? v * timeSec / boss.hp : 0;
    const clearSec = v > 0 ? boss.hp / v : Infinity;
    const partyNeeded = pct > 0 ? Math.ceil(1 / pct) : Infinity;
    return {
      boss, dps: v, pct, clearSec, partyNeeded,
      force: forceMult(S, boss), def: defMult(boss.pdr, S.ied), lvl: levelMult(S.level, boss.level),
      status: pct >= 1.5 ? 'comfortable' : pct >= 1 ? 'solo' : (partyNeeded <= boss.party ? 'party' : 'no'),
    };
  }
  function bossTable(state, delta) {
    return bossList(state).map((b) => bossEstimate(state, b, delta));
  }
  /** Calibrate using a real solo clear time (minutes). Returns new calib factor. */
  function calibrate(state, bossId, minutes) {
    const boss = bossById(state, bossId);
    const est = bossEstimate(state, boss);
    if (!(minutes > 0) || !isFinite(est.clearSec)) return state.calib;
    return (Number(state.calib) || 1) * (est.clearSec / (minutes * 60));
  }

  // ---------------------------------------------------------------------------
  // Efficiency (스펙 효율)
  // ---------------------------------------------------------------------------
  const EFFICIENCY_ROWS = [
    ['1% Boss Damage', { boss: 0.01 }],
    ['1% Damage', { dmg: 0.01 }],
    ['1% Ignore DEF', { ied: [0.01] }],
    ['1% Critical Damage', { cd: 0.01 }],
    ['1% Critical Rate', { cr: 0.01 }],
    ['1% Final Damage', { fd: [0.01] }],
    ['1 ATT (flat)', { attFlat: 1 }],
    ['1% ATT', { attPct: 0.01 }],
    ['1% Main stat', { mainPct: 0.01 }],
    ['100 Main stat (flat, %-affected)', { mainFlat: 100 }],
    ['100 Main stat (unaffected)', { mainUnaff: 100 }],
    ['100 Sub stat (flat)', { subFlat: 100 }],
    ['+10 Sacred Power', { sac: 10 }],
    ['+10 Arcane Power', { af: 10 }],
    ['+1 Character level', { level: 1 }],
  ];
  function gainOf(state, boss, delta) {
    const before = dps(state, boss);
    if (!(before > 0)) return 0;
    return dps(state, boss, delta) / before - 1;
  }
  /** Flat unaffected main stat that gives the same gain (bisection). */
  function mainStatEquivalent(state, boss, gain) {
    if (!(gain > 0)) return gain < 0 ? -mainStatEquivalent(state, boss, -gain) : 0;
    let lo = 0, hi = 1000;
    while (gainOf(state, boss, { mainUnaff: hi }) < gain && hi < 1e8) hi *= 2;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      if (gainOf(state, boss, { mainUnaff: mid }) < gain) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }
  function efficiencyTable(state, boss) {
    const per100 = gainOf(state, boss, { mainUnaff: 100 });
    return EFFICIENCY_ROWS.map(([label, delta]) => {
      const g = gainOf(state, boss, delta);
      return { label, delta, gain: g, mainEq: per100 > 0 ? 100 * g / per100 : 0 };
    });
  }

  // ---------------------------------------------------------------------------
  // Star Force
  // ---------------------------------------------------------------------------
  function sfMaxStars(level) {
    if (level >= 138) return 30;
    if (level >= 128) return 20;
    if (level >= 118) return 15;
    if (level >= 108) return 10;
    return 8;
  }
  function sfBaseCost(level, s) {
    const L = Math.floor(level / 10) * 10;
    const L3 = L * L * L;
    let c;
    if (s < 10) c = 1000 + L3 * (s + 1) / 25;
    else c = 1000 + L3 * Math.pow(s + 1, 2.7) / (D.SF.costDiv[s] || D.SF.costDivDefault);
    return Math.round(c / 100) * 100;
  }
  /** Strategy chosen for star s: '1' | 'sg' | '2' | '3' | '4'. */
  function sfChoice(s, opts) {
    const plan = (opts && opts.plan) || {};
    let c = plan[s] != null ? String(plan[s]) : (opts && opts.safeguard && s >= 15 && s <= 17 ? 'sg' : '1');
    if (!D.sfOptionsFor(s).includes(c)) c = c === '4' && s >= 15 && s <= 17 ? 'sg' : '1';
    return c;
  }
  function sfAttempt(level, s, opts) {
    opts = opts || {};
    const base = sfBaseCost(level, s);
    const choice = sfChoice(s, opts);
    const isMode = s >= 15 && s <= 21;
    const mode = choice === 'sg' ? 1 : Number(choice) || 1;
    const costMult = isMode ? ((s <= 17 ? D.SF.modeCost.low : D.SF.modeCost.high)[mode] || 1) : 1;
    let disc = 1;
    if (opts.sfEvent30) disc *= 0.7;
    if (s < 17) disc *= ({ none: 1, silver: 0.97, gold: 0.95, diamond: 0.9 }[opts.mvp || 'none'] || 1);
    let total = base * disc * costMult;
    let p = D.SF.success[s] || 0;
    if (isMode && D.SF.modeSuccess[mode] && D.SF.modeSuccess[mode][s] != null) p = D.SF.modeSuccess[mode][s];
    if (opts.starCatch) p = Math.min(1, p * 1.05);
    const frac = isMode ? D.SF.modeBoomOfFail[mode][s] : (D.SF.boomOfFail[s] || 0);
    let b = (1 - p) * frac;
    if (opts.sfBoomReduce && s < 21) b *= 0.7;
    if (choice === 'sg') { total += base * 2; b = 0; } // +200% of base, discounts don't apply
    return { cost: total, p, b, choice, costMult: choice === 'sg' ? 3 : costMult };
  }
  function sfDest(s, opts) {
    if (opts && opts.keepOnBoom) return Math.min(s, 22); // KMS-style trace (keeps star, max 22★)
    return D.SF.boomDest(s);
  }
  /**
   * Expected mesos, booms and taps from star `from` to `to`, solved exactly as a
   * linear system. A boom sends the item to its trace-restore star and costs `replaceCost`.
   */
  function sfExpected(level, from, to, opts, replaceCost) {
    if (to <= from) return { cost: 0, booms: 0, attempts: 0 };
    const lo = Math.min(from, D.SF.restoreStar);
    const n = to - lo;
    const att = [];
    for (let s = lo; s < to; s++) att.push(sfAttempt(level, s, opts));
    // (p+b) E[s] - p E[s+1] - b E[dest(s)] = rhs
    const solve = (rhsFn) => {
      const M = [], v = [];
      for (let i = 0; i < n; i++) {
        const s = lo + i, a = att[i];
        const row = new Array(n).fill(0);
        row[i] += a.p + a.b;
        if (s + 1 < to) row[i + 1] -= a.p;
        const di = sfDest(s, opts) - lo;
        if (a.b > 0 && di >= 0 && di < n) row[di] -= a.b;
        M.push(row); v.push(rhsFn(a));
      }
      for (let c = 0; c < n; c++) { // Gaussian elimination with partial pivoting
        let piv = c;
        for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
        [M[c], M[piv]] = [M[piv], M[c]]; [v[c], v[piv]] = [v[piv], v[c]];
        for (let r = 0; r < n; r++) {
          if (r === c || !M[r][c]) continue;
          const f = M[r][c] / M[c][c];
          for (let k = c; k < n; k++) M[r][k] -= f * M[c][k];
          v[r] -= f * v[c];
        }
      }
      return v[from - lo] / M[from - lo][from - lo];
    };
    return {
      cost: solve((a) => a.cost + a.b * (replaceCost || 0)),
      booms: solve((a) => a.b),
      attempts: solve(() => 1),
    };
  }
  /** Pick the cheapest expected strategy (mode / safeguard) per star by coordinate descent. */
  function sfOptimizePlan(level, from, to, opts, replaceCost) {
    const plan = {};
    for (const s of D.SF.modeStars) plan[s] = sfChoice(s, opts);
    const cost = (pl) => sfExpected(level, from, to, Object.assign({}, opts, { plan: pl }), replaceCost).cost;
    let best = cost(plan);
    for (let iter = 0; iter < 6; iter++) {
      let improved = false;
      for (const s of D.SF.modeStars) {
        if (s >= to) continue;
        for (const c of D.sfOptionsFor(s)) {
          if (c === plan[s]) continue;
          const t = Object.assign({}, plan, { [s]: c });
          const v = cost(t);
          if (v < best * (1 - 1e-9)) { best = v; Object.assign(plan, t); improved = true; }
        }
      }
      if (!improved) break;
    }
    return { plan, cost: best };
  }
  /** Monte-Carlo distribution of cost (median / p90). */
  function sfSimulate(level, from, to, opts, replaceCost, runs) {
    runs = runs || 1000;
    const attempts = [];
    for (let s = 0; s < 30; s++) attempts.push(sfAttempt(level, s, opts));
    const costs = [];
    let seed = 0x9e3779b9;
    const rnd = () => { // mulberry32
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let r = 0; r < runs; r++) {
      let s = from, c = 0, guard = 0;
      while (s < to && guard++ < 200000) {
        const a = attempts[s];
        c += a.cost;
        const x = rnd();
        if (x < a.p) s++;
        else if (x < a.p + a.b) { s = sfDest(s, opts); c += replaceCost || 0; }
      }
      costs.push(c);
    }
    costs.sort((a, b) => a - b);
    return { p50: costs[Math.floor(runs * 0.5)], p90: costs[Math.floor(runs * 0.9)], mean: costs.reduce((a, b) => a + b, 0) / runs };
  }
  function sfOptsFrom(st) {
    return { sfEvent30: st.sfEvent30, sfBoomReduce: st.sfBoomReduce, starCatch: st.starCatch, mvp: st.mvp,
      keepOnBoom: st.keepOnBoom, plan: st.sfPlan || {} };
  }
  function sfStatBracket(level) {
    if (level >= 250) return 17;
    if (level >= 200) return 15;
    if (level >= 160) return 13;
    if (level >= 150) return 11;
    if (level >= 140) return 9;
    return 7;
  }
  function sfAttShift(level) {
    if (level >= 250) return 2;
    if (level >= 200) return 0;
    if (level >= 160) return -3;
    return -5;
  }
  /** Delta gained by going from star `from` to `to` on an item. */
  function sfDelta(item, from, to) {
    const d = emptyDelta();
    for (let t = from + 1; t <= to; t++) {
      let stat = 0, att = 0;
      if (t <= 5) stat = 2; else if (t <= 15) stat = 3; else if (t <= 22) stat = sfStatBracket(item.level);
      if (item.kind === 'weapon') {
        att = t <= 15 ? Math.round(item.level * 0.03) : Math.max(0, (D.SF.weaponAtt200[t] || 0) + sfAttShift(item.level));
      } else if (t > 15) att = Math.max(0, (D.SF.armorAtt200[t] || 0) + sfAttShift(item.level));
      d.mainFlat += stat; d.subFlat += stat; d.attFlat += att;
    }
    return d;
  }

  // ---------------------------------------------------------------------------
  // Potential (Legendary main potential)
  // ---------------------------------------------------------------------------
  function potProbability(level, potType, cubeId, target) {
    const cube = D.CUBES[cubeId] || D.CUBES.black;
    const [pm, pa, nm, na] = D.potValues(level);
    const L = D.POT_LINES[potType === 'att' ? 'att' : 'stat'];
    const lineOutcomes = (prime) => {
      const src = prime ? L.prime : L.nonprime;
      const main = prime ? pm : nm, all = prime ? pa : na;
      const out = [{ v: main, p: src.main }];
      if (src.all) out.push({ v: all, p: src.all });
      out.push({ v: 0, p: 1 - src.main - (src.all || 0) });
      return out;
    };
    // distribution of each line value
    const lines = cube.prime.map((pp) => {
      const dist = {};
      for (const o of lineOutcomes(true)) dist[o.v] = (dist[o.v] || 0) + pp * o.p;
      for (const o of lineOutcomes(false)) dist[o.v] = (dist[o.v] || 0) + (1 - pp) * o.p;
      return dist;
    });
    let total = { 0: 1 };
    for (const dist of lines) {
      const nt = {};
      for (const [a, pa2] of Object.entries(total)) for (const [b, pb] of Object.entries(dist)) {
        const k = Number(a) + Number(b);
        nt[k] = (nt[k] || 0) + pa2 * pb;
      }
      total = nt;
    }
    let p = 0;
    for (const [v, pv] of Object.entries(total)) if (Number(v) >= target) p += pv;
    return p;
  }
  function potTargets(level, current) {
    const [pm, pa, nm] = D.potValues(level);
    const vals = new Set();
    for (const a of [pm, pa, nm, 0]) for (const b of [pm, pa, nm, 0]) for (const c of [pm, pa, nm, 0]) vals.add(a + b + c);
    return [...vals].filter((v) => v > current && v >= 2 * nm).sort((a, b) => a - b);
  }
  function rollsForChance(p, q) {
    if (p <= 0) return Infinity;
    if (p >= 1) return 1;
    return Math.ceil(Math.log(1 - q) / Math.log(1 - p));
  }

  // ---------------------------------------------------------------------------
  // Optimizers
  // ---------------------------------------------------------------------------
  function hyperOptimize(state, boss) {
    const keys = Object.keys(D.HYPER_STATS);
    const budget = hyperSpent(state.hyper) + (Number(state.hyperExtra) || 0);
    const removeCur = negDelta(hyperDelta(state.hyper));
    const evalAlloc = (h) => dps(state, boss, addDelta(removeCur, hyperDelta(h)));
    const spent = (h) => hyperSpent(h);
    let h = {}; keys.forEach((k) => { h[k] = 0; });
    // greedy
    for (;;) {
      let best = null;
      const base = evalAlloc(h);
      for (const k of keys) {
        if (h[k] >= 15) continue;
        const c = D.HYPER_COST[h[k]];
        if (spent(h) + c > budget) continue;
        const t = Object.assign({}, h, { [k]: h[k] + 1 });
        const eff = (evalAlloc(t) - base) / c;
        if (!best || eff > best.eff) best = { k, eff };
      }
      if (!best || best.eff <= 0) break;
      h[best.k] += 1;
    }
    // local search: remove one level from a, then greedily refill
    const refill = (x) => {
      for (;;) {
        let best = null;
        const base = evalAlloc(x);
        for (const k of keys) {
          if (x[k] >= 15) continue;
          const c = D.HYPER_COST[x[k]];
          if (spent(x) + c > budget) continue;
          const t = Object.assign({}, x, { [k]: x[k] + 1 });
          const g = evalAlloc(t) - base;
          if (g > 0 && (!best || g / c > best.eff)) best = { k, eff: g / c };
        }
        if (!best) return x;
        x[best.k] += 1;
      }
    };
    let cur = evalAlloc(h);
    for (let iter = 0; iter < 60; iter++) {
      let improved = false;
      for (const a of keys) {
        for (let drop = 1; drop <= 3; drop++) {
          if (h[a] - drop < 0) continue;
          const t = refill(Object.assign({}, h, { [a]: h[a] - drop }));
          const v = evalAlloc(t);
          if (v > cur * (1 + 1e-9)) { h = t; cur = v; improved = true; }
        }
      }
      if (!improved) break;
    }
    const before = dps(state, boss);
    return { alloc: h, budget, used: spent(h), gain: before > 0 ? cur / before - 1 : 0, delta: addDelta(removeCur, hyperDelta(h)) };
  }

  function legionOptimize(state, boss) {
    const R = D.LEGION_REGIONS;
    const keys = Object.keys(R);
    const budget = keys.reduce((s, k) => s + (Number(state.legion[k]) || 0), 0);
    const removeCur = negDelta(legionDelta(state.legion));
    const evalAlloc = (l) => dps(state, boss, addDelta(removeCur, legionDelta(l)));
    let l = {}; keys.forEach((k) => { l[k] = 0; });
    let used = 0;
    while (used < budget) {
      let best = null;
      const base = evalAlloc(l);
      for (const k of keys) {
        if (l[k] >= R[k].max) continue;
        const g = evalAlloc(Object.assign({}, l, { [k]: l[k] + 1 })) - base;
        if (!best || g > best.g) best = { k, g };
      }
      if (!best || best.g <= 0) break;
      l[best.k]++; used++;
    }
    // swap pass
    let cur = evalAlloc(l);
    for (let iter = 0; iter < 200; iter++) {
      let improved = false;
      for (const a of keys) for (const b of keys) {
        if (a === b || l[a] <= 0 || l[b] >= R[b].max) continue;
        const t = Object.assign({}, l, { [a]: l[a] - 1, [b]: l[b] + 1 });
        const v = evalAlloc(t);
        if (v > cur * (1 + 1e-9)) { l = t; cur = v; improved = true; }
      }
      if (!improved) break;
    }
    const before = dps(state, boss);
    return { alloc: l, budget, gain: before > 0 ? cur / before - 1 : 0, delta: addDelta(removeCur, legionDelta(l)) };
  }

  // ---------------------------------------------------------------------------
  // Familiar upgrade options
  // ---------------------------------------------------------------------------
  /**
   * Familiar reroll targets. A reroll changes both lines and a 2nd matching line is ~100× rarer than the 1st,
   * so each option aims for the target on line 1 and assumes line 2 comes back as a non-combat line.
   */
  function familiarOptions(state, boss) {
    const out = [];
    const famDeltaNow = familiarDelta(state.familiars, state.badges);
    const targets = [{ type: 'boss', val: 50 }, { type: 'boss', val: 45 }, { type: 'ied', val: 50 }, { type: 'ied', val: 45 }];
    state.familiars.forEach((f, fi) => {
      for (const tg of targets) {
        const cur = f.lines[0];
        if (cur.type === tg.type && Number(cur.val) >= tg.val) continue;
        const t = clone(state.familiars);
        t[fi] = { tier: 'Legendary', lines: [clone(tg), { type: 'none', val: 0 }] };
        const odds = D.FAMILIAR_ODDS[tg.type + ':' + tg.val];
        const rerolls = 1 / odds.line1;
        out.push({
          label: `Familiar ${fi + 1} → Legendary ${tg.type === 'boss' ? 'Boss' : 'IED'} ${tg.val}%`,
          delta: addDelta(negDelta(famDeltaNow), familiarDelta(t, state.badges)), rerolls, newFamiliars: t,
          cost: rerolls * (Number(state.settings.famRerollCost) || 0),
          capped: tg.type === 'boss' && familiarBossRaw(t) > D.FAMILIAR_BOSS_CAP + 1e-9,
        });
      }
    });
    return out;
  }

  // ---------------------------------------------------------------------------
  // Bake a delta into the stat-window values (used to chain upgrades)
  // ---------------------------------------------------------------------------
  function bakeDelta(state, d) {
    const s = clone(state);
    const S0 = effective(state, null, { noDoping: true });
    const S1 = effective(state, d, { noDoping: true });
    // If familiars are not in the stat window, effective() adds them; subtract that again.
    s.mainStat = state.mainStat + (S1.main - S0.main);
    s.mainPct = state.mainPct + 100 * (d.mainPct || 0);
    // with auto symbol stat, the symbol part of mainUnaff is re-derived from the new force values
    s.unaffOther = state.unaffOther + (d.mainUnaff || 0) - (state.autoSymbol ? 20 * (d.sac || 0) + 10 * (d.af || 0) : 0);
    s.subStat = state.subStat + (S1.sub - S0.sub);
    s.att = state.att + (S1.att - S0.att);
    s.attPct = state.attPct + 100 * (d.attPct || 0);
    s.dmg = state.dmg + 100 * (d.dmg || 0);
    s.boss = state.boss + 100 * (d.boss || 0);
    s.ied = 100 * combineIed(state.ied / 100, d.ied);
    s.cr = state.cr + 100 * (d.cr || 0);
    s.cd = state.cd + 100 * (d.cd || 0);
    s.fd = 100 * (combineFd(1 + state.fd / 100, d.fd) - 1);
    s.level = state.level + (d.level || 0);
    s.arcane = state.arcane + (d.af || 0);
    s.sacred = state.sacred + (d.sac || 0);
    return s;
  }

  // ---------------------------------------------------------------------------
  // Upgrade candidates (cost AND gain)
  // ---------------------------------------------------------------------------
  function upgradeCandidates(state, boss) {
    const st = state.settings;
    const sfOpts = sfOptsFrom(st);
    const out = [];

    (state.gear || []).forEach((item, gi) => {
      if (item.kind !== 'acc') {
        const max = sfMaxStars(item.level);
        const cur = Number(item.stars) || 0;
        const goals = new Set();
        if (cur < max) goals.add(cur + 1);
        for (const m of [17, 18, 20, 22, 23, 25]) if (m > cur + 1 && m <= max) { goals.add(m); break; }
        for (const g of goals) {
          const e = sfExpected(item.level, cur, g, sfOpts, Number(item.replace) || 0);
          out.push({
            cat: 'Star Force', label: `${item.slot}: ${cur}★ → ${g}★`, cost: e.cost, delta: sfDelta(item, cur, g),
            note: `~${e.attempts.toFixed(1)} taps, ${e.booms.toFixed(2)} expected booms`, booms: e.booms,
            sim: { level: item.level, from: cur, to: g, opts: sfOpts, replace: Number(item.replace) || 0 },
            apply: (s) => { s.gear[gi].stars = g; },
          });
        }
      }
      const curPot = Number(item.pot) || 0;
      const targets = potTargets(item.level, curPot).slice(0, 2);
      for (const tg of targets) {
        const p = potProbability(item.level, item.potType, st.cube, tg);
        if (p <= 0) continue;
        const rolls = 1 / p;
        const d = emptyDelta();
        if (item.potType === 'att') d.attPct = (tg - curPot) / 100; else d.mainPct = (tg - curPot) / 100;
        out.push({
          cat: 'Potential', label: `${item.slot}: ${curPot}% → ${tg}% ${item.potType === 'att' ? 'ATT' : 'stat'}`,
          cost: rolls * (Number(st.cubeCost) || 0), delta: d,
          note: `${(p * 100).toFixed(2)}% per ${D.CUBES[st.cube].label}; ~${Math.round(rolls)} avg, ${rollsForChance(p, 0.9)} for 90%`,
          apply: (s) => { s.gear[gi].pot = tg; },
        });
      }
    });

    for (const f of familiarOptions(state, boss)) {
      out.push({ cat: 'Familiar', label: f.label + (f.capped ? ' (hits 120% boss cap)' : ''), cost: f.cost, delta: f.delta,
        note: `~${int0(f.rerolls)} rerolls (community odds: 1 in ${int0(f.rerolls)})`,
        apply: (s) => { s.familiars = clone(f.newFamiliars); } });
    }

    const hy = hyperOptimize(state, boss);
    if (hy.gain > 1e-6) out.push({ cat: 'Hyper Stat', label: 'Re-allocate hyper stats (see Optimize tab)', cost: Number(st.hyperResetCost) || 0,
      delta: hy.delta, note: 'Reset fee', apply: (s) => { s.hyper = clone(hy.alloc); }, freeish: true });
    const lg = legionOptimize(state, boss);
    if (lg.gain > 1e-6) out.push({ cat: 'Legion', label: 'Re-arrange legion board (see Optimize tab)', cost: 0, delta: lg.delta,
      note: 'Free — board geometry not checked', apply: (s) => { s.legion = clone(lg.alloc); }, freeish: true });

    (state.useHexa ? state.hexa : []).forEach((c, ci) => {
      const cost = hexaStepCost(c);
      const g = hexaStepGain(c);
      if (!cost || g <= 0) return;
      out.push({ cat: 'HEXA', label: `${c.name}: Lv ${c.level} → ${c.level + 1}`, cost: cost.frag * (Number(st.fragPrice) || 0),
        delta: { fd: [g] }, note: `${cost.frag} fragments, ${cost.erda} Sol Erda`, freeish: !(Number(st.fragPrice) > 0),
        apply: (s) => { s.hexa[ci].level += 1; } });
    });

    if (Number(state.authSymbols) > 0) {
      out.push({ cat: 'Symbol', label: 'Authentic symbol +1 level', cost: Number(st.symbolCost) || 0, delta: { sac: 10, mainUnaff: 200 },
        note: 'Time-gated (dailies)', freeish: !(Number(st.symbolCost) > 0), apply: () => {} });
    }

    for (const c of state.custom || []) {
      out.push({ cat: 'Custom', label: c.label, cost: Number(c.cost) || 0, delta: c.delta, note: 'From Item Maker', apply: () => {} });
    }

    const before = dps(state, boss);
    const listBefore = bossList(state).map((b) => bossEstimate(state, b).pct >= 1);
    for (const c of out) {
      if (c.cat === 'Hyper Stat' || c.cat === 'Legion' || c.cat === 'HEXA') c.gain = c.cat === 'HEXA' ? c.delta.fd[0] : (c.cat === 'Hyper Stat' ? hy.gain : lg.gain);
      else c.gain = before > 0 ? dps(state, boss, c.delta) / before - 1 : 0;
      c.eff = c.cost > 0 ? c.gain / (c.cost / 1e9) : Infinity;
      const unlock = [];
      bossList(state).forEach((b, i) => {
        if (!listBefore[i] && bossEstimate(state, b, c.delta).pct >= 1) unlock.push(b.name);
      });
      c.unlocks = unlock;
    }
    return out;
  }

  /** Greedy budget plan: repeatedly buy the most efficient meso upgrade. */
  function budgetPlan(state, boss, budget, maxSteps) {
    let s = clone(state);
    let left = budget;
    const steps = [];
    let total = 0;
    for (let i = 0; i < (maxSteps || 25); i++) {
      const cands = upgradeCandidates(s, boss).filter((c) => c.cost > 0 && c.cost <= left && c.gain > 0 && c.cat !== 'Custom' && c.cat !== 'Symbol');
      if (!cands.length) break;
      cands.sort((a, b) => b.eff - a.eff);
      const c = cands[0];
      // HEXA gains live in hexaFactor, and familiars outside the stat window are added by effective(),
      // so those upgrades only change the structured state; everything else is baked into the stat window.
      const structural = c.cat === 'HEXA' || (c.cat === 'Familiar' && !s.statIncludesFamiliars);
      const ns = structural ? clone(s) : bakeDelta(s, c.delta);
      c.apply(ns);
      left -= c.cost;
      total = (1 + total) * (1 + c.gain) - 1;
      steps.push({ label: c.label, cat: c.cat, cost: c.cost, gain: c.gain, cumGain: total });
      s = ns;
    }
    return { steps, spent: budget - left, gain: total, finalState: s };
  }

  // ---------------------------------------------------------------------------
  // Mu Lung Dojo (experimental)
  // ---------------------------------------------------------------------------
  const DOJO_FLOORS = 80;
  function dojoFloorHp(n) { return 8e9 * Math.pow(1.2, n - 40); } // anchored on the 40F boss (8B)
  function dojoPdr(n) { return n < 60 ? 0.5 : n < 70 ? 1.0 : n < 80 ? 1.5 : 2.0; }
  function dojoEstimate(state) {
    let t = 0, floor = 0;
    for (let n = 1; n <= DOJO_FLOORS; n++) {
      const boss = { level: Math.min(290, 100 + 2 * n), pdr: dojoPdr(n), force: null, req: 0 };
      const v = dps(state, boss) * 0.1; // Dojo reduces final damage by 90%
      const need = dojoFloorHp(n) / v + 2;
      if (t + need > 900) break;
      t += need; floor = n;
    }
    return { floor, time: t, maxed: floor >= DOJO_FLOORS };
  }

  // ---------------------------------------------------------------------------
  // Share / import
  // ---------------------------------------------------------------------------
  function encodeState(state) {
    const json = JSON.stringify(state);
    if (typeof btoa === 'function') return btoa(unescape(encodeURIComponent(json)));
    return Buffer.from(json, 'utf8').toString('base64');
  }
  function decodeState(str) {
    const json = typeof atob === 'function' ? decodeURIComponent(escape(atob(str))) : Buffer.from(str, 'base64').toString('utf8');
    return mergeState(JSON.parse(json));
  }

  const API = {
    defaultState, mergeState, clone, bossList, bossById,
    emptyDelta, addDelta, negDelta, combineIed, combineFd,
    familiarDelta, familiarBossRaw, hyperDelta, hyperCost, hyperSpent, legionDelta, dopingDelta, symbolStat, unaffected,
    effective, rawScore, score, hexaScore, defMult, critMult, arcaneMult, sacredMult, forceMult, levelMult,
    hexaFactor, hexaStepGain, hexaStepCost, hexaPlan, ringFactor, ringTable,
    dps, bossEstimate, bossTable, calibrate,
    EFFICIENCY_ROWS, gainOf, mainStatEquivalent, efficiencyTable,
    sfMaxStars, sfBaseCost, sfChoice, sfAttempt, sfDest, sfExpected, sfOptimizePlan, sfSimulate, sfDelta, sfOptsFrom,
    potProbability, potTargets, rollsForChance,
    hyperOptimize, legionOptimize, familiarOptions, bakeDelta, upgradeCandidates, budgetPlan,
    dojoFloorHp, dojoPdr, dojoEstimate, encodeState, decodeState,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.MSCalc = API;
})(typeof window !== 'undefined' ? window : globalThis);
