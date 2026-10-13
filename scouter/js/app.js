/* GMS Scouter — UI layer. */
(function () {
  'use strict';
  const D = window.MSData;
  const C = window.MSCalc;
  const LS_CUR = 'gmsScouter.current';
  const LS_SAVED = 'gmsScouter.saved';
  const LS_THEME = 'gmsScouter.theme';

  // ---------------------------------------------------------------------------
  // Storage helpers (browser storage can be unavailable — never fail on it)
  // ---------------------------------------------------------------------------
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
  };
  function loadSaved() { try { return JSON.parse(store.get(LS_SAVED) || '{}'); } catch (e) { return {}; } }
  function writeSaved(m) { store.set(LS_SAVED, JSON.stringify(m)); }

  let state = C.defaultState();
  try {
    const m = location.hash.match(/s=([^&]+)/);
    if (m) state = C.decodeState(decodeURIComponent(m[1]));
    else if (store.get(LS_CUR)) state = C.mergeState(JSON.parse(store.get(LS_CUR)));
  } catch (e) { state = C.defaultState(); }

  const ui = { tab: 'character', candFilter: 'all', hideTrivial: true, itemOld: {}, itemNew: {}, itemCost: 0, itemLabel: 'New item',
    sf: { level: 200, from: 17, to: 22, replace: 0 }, calibBoss: 'hseren', calibMin: 20, budget: null };

  // ---------------------------------------------------------------------------
  // Formatting
  // ---------------------------------------------------------------------------
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const int = (n) => (isFinite(n) ? Math.round(n).toLocaleString('en-US') : '∞');
  function big(n, d) {
    if (!isFinite(n)) return '∞';
    d = d == null ? 2 : d;
    const a = Math.abs(n);
    if (a >= 1e15) return (n / 1e15).toFixed(d) + 'Q';
    if (a >= 1e12) return (n / 1e12).toFixed(d) + 'T';
    if (a >= 1e9) return (n / 1e9).toFixed(d) + 'B';
    if (a >= 1e6) return (n / 1e6).toFixed(d) + 'M';
    if (a >= 1e4) return (n / 1e3).toFixed(1) + 'K';
    return Math.round(n).toLocaleString('en-US');
  }
  const pct = (x, d) => (isFinite(x) ? (x * 100).toFixed(d == null ? 1 : d) + '%' : '∞');
  const sgnPct = (x, d) => (x >= 0 ? '+' : '') + pct(x, d == null ? 2 : d);
  function dur(sec) {
    if (!isFinite(sec)) return '—';
    if (sec < 60) return Math.round(sec) + 's';
    const m = Math.floor(sec / 60), s = Math.round(sec % 60);
    if (m >= 600) return '>10h';
    if (m >= 60) return Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
    return m + 'm ' + String(s).padStart(2, '0') + 's';
  }
  const STATUS_LABEL = { comfortable: 'Comfortable', solo: 'Solo-able', party: 'Party', no: 'Not yet' };

  // ---------------------------------------------------------------------------
  // State path helpers + input builders
  // ---------------------------------------------------------------------------
  function getPath(obj, path) { return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj); }
  function setPath(obj, path, v) {
    const ks = path.split('.');
    let o = obj;
    for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null) o[ks[i]] = {}; o = o[ks[i]]; }
    o[ks[ks.length - 1]] = v;
  }
  const ROOTS = { s: () => state, u: () => ui };
  function resolve(key) { const [r, ...rest] = key.split(':'); return [ROOTS[r](), rest.join(':')]; }
  function val(key) { const [o, p] = resolve(key); return getPath(o, p); }

  function inp(key, label, o) {
    o = o || {};
    const v = val(key);
    return `<div class="field"${o.title ? ` title="${esc(o.title)}"` : ''}><label>${esc(label)}${o.approx ? ' <span class="tag approx">approx</span>' : ''}</label>
      <input data-k="${key}" data-t="${o.type || 'num'}" type="${o.type === 'str' ? 'text' : 'number'}" value="${esc(v == null ? '' : v)}"
      ${o.step ? `step="${o.step}"` : 'step="any"'} ${o.min != null ? `min="${o.min}"` : ''} ${o.max != null ? `max="${o.max}"` : ''}></div>`;
  }
  function sel(key, label, options, o) {
    o = o || {};
    const v = String(val(key));
    const opts = options.map(([ov, ol]) => `<option value="${esc(ov)}"${String(ov) === v ? ' selected' : ''}>${esc(ol)}</option>`).join('');
    return `<div class="field">${label ? `<label>${esc(label)}</label>` : ''}<select data-k="${key}" data-t="${o.type || 'str'}">${opts}</select></div>`;
  }
  function chk(key, label) {
    return `<label class="check"><input type="checkbox" data-k="${key}" data-t="bool"${val(key) ? ' checked' : ''}> ${esc(label)}</label>`;
  }
  const bossOptions = () => C.bossList(state).map((b) => [b.id, b.name]);
  const cls = () => D.CLASSES.find((c) => c.id === state.cls) || D.CLASSES[0];

  // ---------------------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------------------
  const TABS = {};

  // ---- Character -------------------------------------------------------------
  TABS.character = {
    render() {
      const c = cls();
      const famCards = state.familiars.map((f, fi) => {
        const tierSel = sel(`s:familiars.${fi}.tier`, '', D.FAMILIAR_TIERS.map((t) => [t, t]));
        const lines = f.lines.map((ln, li) => {
          const def = D.FAMILIAR_LINES[ln.type] || D.FAMILIAR_LINES.none;
          const opts = (def.values[f.tier] || [0]).map((x) => `<option value="${x}">`).join('');
          return `<div class="line">
            ${sel(`s:familiars.${fi}.lines.${li}.type`, '', Object.entries(D.FAMILIAR_LINES).map(([k, d]) => [k, d.label]))}
            <div class="field"><input data-k="s:familiars.${fi}.lines.${li}.val" data-t="num" type="number" list="fam-${fi}-${li}" value="${esc(ln.val)}"><datalist id="fam-${fi}-${li}">${opts}</datalist></div>
          </div>`;
        }).join('');
        return `<div class="fam"><div class="head"><span class="t-${esc(f.tier)}">Familiar ${fi + 1}</span>${tierSel}</div>${lines}</div>`;
      }).join('');

      return `
      <div class="grid g2">
        <div class="card">
          <h2>Character</h2>
          <div class="form">
            ${inp('s:name', 'Name', { type: 'str' })}
            ${sel('s:cls', 'Class', D.CLASSES.map((x) => [x.id, x.name]))}
            ${inp('s:level', 'Level', { step: 1, min: 200, max: 300 })}
          </div>
          <h3>Stat window (unbuffed)</h3>
          <p class="hint">Copy these straight from the in-game Character Info → Detailed Stats window, with no buffs active.</p>
          <div class="form">
            ${inp('s:mainStat', `${c.main} (main stat)`)}
            ${inp('s:subStat', `${c.sub} (sub stat)`)}
            ${inp('s:att', 'Attack Power (ATT/MATT)')}
            ${inp('s:dmg', 'Damage %')}
            ${inp('s:boss', 'Boss Damage %')}
            ${inp('s:ied', 'Ignore Enemy DEF %')}
            ${inp('s:cr', 'Critical Rate %')}
            ${inp('s:cd', 'Critical Damage %')}
            ${inp('s:fd', 'Extra Final Damage %', { title: 'Final damage outside your class skills (e.g. from link skills, set effects). Usually 0.' })}
          </div>
        </div>

        <div class="card">
          <h2>Stat breakdown <span class="tag">needed for % efficiency</span></h2>
          <p class="hint">The stat window only shows totals. These let the calculator tell how much 1% stat or 1% ATT is worth to you.
            Rough values are fine.</p>
          <div class="form">
            ${inp('s:mainPct', `Total ${c.main} % (all sources)`)}
            ${inp('s:unaffOther', 'Flat stat not affected by % (hyper, legion, etc.)')}
            ${inp('s:attPct', 'Total ATT %')}
            ${inp('s:subPct', `Total ${c.sub} %`)}
            ${inp('s:arcane', 'Arcane Power')}
            ${inp('s:sacred', 'Sacred Power (Authentic)')}
            ${inp('s:authSymbols', 'Authentic symbols owned', { step: 1, min: 0, max: 7 })}
          </div>
          <div class="row" style="margin-top:8px">${chk('s:autoSymbol', 'Add symbol stat automatically (from Arcane / Sacred Power)')}</div>
          <div data-out="breakdown" class="hint" style="margin-top:8px"></div>
        </div>
      </div>

      <div class="card" style="margin-top:14px">
        <h2>Familiars <span class="tag">GMS</span></h2>
        <p class="hint">Pick a preset, or set the tier and line type and the value fills in automatically. Familiar Boss Damage is capped at 120% total.
          Each IED line stacks multiplicatively.</p>
        <div class="row" style="margin-bottom:10px">
          ${chk('s:statIncludesFamiliars', 'My stat window already includes these familiars (summoned)')}
        </div>
        <div class="chips" style="margin-bottom:10px">
          ${Object.entries(D.FAMILIAR_PRESETS).map(([k, p]) => `<button class="chip" data-act="famPreset" data-v="${k}">${esc(p.label)}</button>`).join('')}
        </div>
        <div class="grid g3">${famCards}</div>
        <h3>Badges</h3>
        <div class="form">
          ${inp('s:badges.boss', 'Badge Boss %')}
          ${inp('s:badges.ied', 'Badge IED %')}
          ${inp('s:badges.dmg', 'Badge Damage %')}
        </div>
        <div data-out="famTotals" style="margin-top:10px"></div>
      </div>

      <div class="grid g2" style="margin-top:14px">
        <div class="card">
          <h2>Hyper Stats <span class="tag">levels</span></h2>
          <div class="form">
            ${Object.entries(D.HYPER_STATS).map(([k, d]) => inp(`s:hyper.${k}`, d.label, { step: 1, min: 0, max: 15 })).join('')}
            ${inp('s:hyperExtra', 'Unspent / spare points', { step: 1, min: 0 })}
          </div>
          <div data-out="hyperInfo" class="hint" style="margin-top:8px"></div>
        </div>
        <div class="card">
          <h2>Legion board <span class="tag">cells</span></h2>
          <div class="form">
            ${Object.entries(D.LEGION_REGIONS).map(([k, d]) => inp(`s:legion.${k}`, d.label, { step: 1, min: 0, max: d.max })).join('')}
          </div>
          <p class="hint">Only offensive regions are modelled. Legion values are already in your stat window; these are used by the optimizer.</p>
        </div>
      </div>

      <div class="grid g2" style="margin-top:14px">
        <div class="card">
          <h2>Bossing buffs (doping)</h2>
          <div class="row" style="margin-bottom:8px">${chk('s:useDoping', 'Apply these buffs to boss estimates')}</div>
          <table><tbody>
          ${D.DOPING.map((dp) => `<tr><td class="l">${chk(`s:doping.${dp.id}`, dp.name)}${dp.approx ? ' <span class="tag approx">approx</span>' : ''}</td>
            <td style="width:110px"><input data-k="s:dopingVals.${dp.id}" data-t="num" type="number" value="${esc(state.dopingVals[dp.id] != null ? state.dopingVals[dp.id] : dp.val)}"></td>
            <td class="muted">${{ attPct: 'ATT %', attFlat: 'ATT', boss: 'Boss %', dmg: 'Dmg %', ied: 'IED %' }[dp.stat]}</td></tr>`).join('')}
          </tbody></table>
        </div>
        <div class="card">
          <h2>Seed ring, burst &amp; tuning</h2>
          <div class="form">
            ${sel('s:ring.id', 'Seed ring', Object.entries(D.SEED_RINGS).map(([k, r]) => [k, r.label]))}
            ${inp('s:ring.level', 'Ring level', { step: 1, min: 1, max: 4 })}
            ${inp('s:burstShare', '% of damage dealt in burst', { title: 'Share of your 2-minute damage dealt inside burst windows' })}
            ${inp('s:burstLen', 'Burst window length (s)')}
            ${inp('s:classFactor', 'Class DPS factor', { title: '1.0 = average class. Set higher/lower if your class out- or under-performs its stats.' })}
            ${inp('s:calib', 'Calibration factor', { title: 'Set automatically from a real clear on the Scouter tab' })}
          </div>
          <p class="hint">Calibrate on the <b>Scouter &amp; Bosses</b> tab with a real solo clear time. That makes every boss estimate match your class.</p>
        </div>
      </div>
      <div class="card" style="margin-top:14px"><h2>Effective stats used for bossing</h2><div data-out="effStats"></div></div>`;
    },
    outputs() {
      const unaff = C.unaffected(state);
      const base = Math.max(0, (state.mainStat - unaff) / (1 + state.mainPct / 100));
      out('breakdown', `Symbol stat: <b>${int(C.symbolStat(state))}</b> · Unaffected total: <b>${int(unaff)}</b> ·
        Base stat before %: <b>${int(base)}</b> · 1% stat ≈ <b>${int(base / 100)}</b> flat`);
      const fd = C.familiarDelta(state.familiars, state.badges);
      const rawBoss = C.familiarBossRaw(state.familiars);
      out('famTotals', `<div class="row">
        <span class="tag">Boss ${pct(fd.boss, 0)}${rawBoss - D.FAMILIAR_BOSS_CAP > 1e-9 ? ` <span class="neg">(capped, ${pct(rawBoss - D.FAMILIAR_BOSS_CAP, 0)} wasted)</span>` : ''}</span>
        <span class="tag">IED ${pct(C.combineIed(0, fd.ied), 1)} combined</span>
        <span class="tag">Damage ${pct(fd.dmg, 0)}</span><span class="tag">ATT +${fd.attFlat}</span>
        <span class="tag">Crit Rate ${pct(fd.cr, 0)}</span><span class="tag">Stat ${pct(fd.mainPct, 0)}</span>
        <span class="tag">Without them: ${sgnPct(C.gainOf(state, C.bossById(state, state.targetBoss), C.negDelta(fd)))} damage vs ${esc(C.bossById(state, state.targetBoss).name)}</span></div>`);
      const avail = D.hyperPointsAtLevel(state.level);
      const spent = C.hyperSpent(state.hyper);
      out('hyperInfo', `Offensive points spent: <b>${int(spent)}</b> of <b>${int(avail)}</b> available at Lv ${state.level}. The rest go to utility stats.`);
      const S = C.effective(state);
      out('effStats', `<div class="tablewrap"><table><thead><tr><th>Main</th><th>Sub</th><th>ATT</th><th>Dmg+Boss</th><th>IED</th><th>Crit Rate</th><th>Crit Dmg</th><th>Final Dmg ×</th></tr></thead>
        <tbody><tr><td>${int(S.main)}</td><td>${int(S.sub)}</td><td>${int(S.att)}</td><td>${pct(S.db, 0)}</td><td>${pct(S.ied, 2)}</td>
        <td>${pct(S.crRaw, 0)}${S.crRaw > 1 ? ' <span class="neg">(over cap)</span>' : ''}</td><td>${pct(S.cd, 1)}</td><td>${S.fd.toFixed(3)}</td></tr></tbody></table></div>`);
    },
  };

  // ---- Scouter & bosses ----------------------------------------------------
  TABS.scouter = {
    render() {
      return `<div class="kpis" data-out="kpis"></div>
      <div class="card">
        <h2>Boss cut <span class="tag">estimated % of the boss you can solo in the time limit</span></h2>
        <div class="row" style="margin-bottom:8px">
          ${chk('u:hideTrivial', 'Hide bosses above 1000%')}
          <span class="hint" style="margin:0">100% = solo kill right at the time limit · ≥150% comfortable · Party = needs that many equally geared players</span>
        </div>
        <div class="tablewrap" data-out="bossTable"></div>
      </div>
      <div class="grid g2" style="margin-top:14px">
        <div class="card">
          <h2>Calibrate with a real clear</h2>
          <p class="hint">Enter a boss you solo and how long it took. All estimates rescale to your class and playstyle, so this is the single biggest accuracy boost.</p>
          <div class="form">
            ${sel('u:calibBoss', 'Boss', bossOptions())}
            ${inp('u:calibMin', 'Solo clear time (minutes)', { min: 0.1 })}
          </div>
          <div class="row" style="margin-top:10px">
            <button class="btn" data-act="calibrate">Calibrate</button>
            <button class="btn ghost" data-act="resetCalib">Reset to 1.0</button>
            <span data-out="calibInfo" class="hint" style="margin:0"></span>
          </div>
        </div>
        <div class="card">
          <h2>Target boss</h2>
          <p class="hint">The Upgrades and Optimize tabs rank everything by damage gained against this boss.</p>
          <div class="form">${sel('s:targetBoss', 'Target boss', bossOptions())}</div>
          <div data-out="targetInfo" style="margin-top:10px"></div>
        </div>
      </div>`;
    },
    outputs() {
      const S = C.effective(state);
      const sc = C.score(S), hs = C.hexaScore(state, S);
      const rows = C.bossTable(state);
      const solo = rows.filter((r) => r.pct >= 1).sort((a, b) => b.boss.hp - a.boss.hp)[0];
      const next = rows.filter((r) => r.pct < 1).sort((a, b) => b.pct - a.pct)[0];
      const range = cls().weapon * (4 * S.main + S.sub) * S.att / 100 * (1 + (state.dmg / 100)) * S.fd;
      const dojo = C.dojoEstimate(state);
      out('kpis', `
        <div class="kpi main"><div class="k">Scouter Score</div><div class="v">${int(sc)}</div><div class="s">main-stat equivalent vs 300% PDR</div></div>
        <div class="kpi main"><div class="k">HEXA Score</div><div class="v">${int(hs)}</div><div class="s">× ${C.hexaFactor(state.hexa).toFixed(3)} from HEXA progress</div></div>
        <div class="kpi"><div class="k">Strongest solo boss</div><div class="v" style="font-size:18px">${solo ? esc(solo.boss.name) : '—'}</div><div class="s">${solo ? pct(solo.pct, 0) + ' · ' + dur(solo.clearSec) : ''}</div></div>
        <div class="kpi"><div class="k">Next boss to unlock</div><div class="v" style="font-size:18px">${next ? esc(next.boss.name) : 'All clear!'}</div><div class="s">${next ? 'at ' + pct(next.pct, 0) + ' — need ' + sgnPct(1 / next.pct - 1, 0) + ' damage' : ''}</div></div>
        <div class="kpi"><div class="k">Est. stat window range</div><div class="v" style="font-size:20px">${big(range)}</div><div class="s">upper range estimate</div></div>
        <div class="kpi"><div class="k">Mu Lung (experimental)</div><div class="v">${dojo.floor}F</div><div class="s">see Mu Lung tab</div></div>`);
      document.getElementById('headerScore').textContent = `${state.name || ''} · Score ${int(sc)}`;

      const shown = rows.filter((r) => !(ui.hideTrivial && r.pct > 10));
      out('bossTable', `<table><thead><tr><th>Boss</th><th>Lv</th><th>PDR</th><th>Force</th><th>Total HP</th><th class="l">Estimated %</th><th></th><th>Solo clear</th><th>Party</th><th>Status</th></tr></thead><tbody>
        ${shown.map((r) => {
          const b = r.boss;
          const w = Math.min(100, r.pct / 2 * 100);
          const force = b.force ? `${b.force === 'arc' ? 'ARC' : 'SAC'} ${b.req} <span class="${r.force >= 1 ? 'pos' : 'neg'}">×${r.force.toFixed(2)}</span>` : '—';
          return `<tr><td>${esc(b.name)}${b.approx ? ' <span class="tag approx" title="HP / requirement from older or uncertain data">≈</span>' : ''}</td>
            <td>${b.level}</td><td>${Math.round(b.pdr * 100)}%</td><td>${force}</td><td>${big(b.hp)}</td>
            <td><div class="bar"><span class="bg-${r.status}" style="width:${w}%"></span></div></td>
            <td class="st-${r.status}"><b>${r.pct >= 10 ? int(r.pct * 100) + '%' : pct(r.pct, 0)}</b></td>
            <td>${dur(r.clearSec)}</td><td>${r.partyNeeded <= b.party ? (r.partyNeeded <= 1 ? 'solo' : r.partyNeeded + ' / ' + b.party) : '—'}</td>
            <td class="st-${r.status}">${STATUS_LABEL[r.status]}</td></tr>`;
        }).join('')}</tbody></table>`);
      out('calibInfo', `Current factor: <b>${Number(state.calib).toFixed(3)}</b>${state.calibNote ? ' · ' + esc(state.calibNote) : ''}`);
      const tb = C.bossEstimate(state, C.bossById(state, state.targetBoss));
      out('targetInfo', `<div class="row"><span class="tag">${pct(tb.pct, 0)} of HP in time</span><span class="tag">Solo clear ${dur(tb.clearSec)}</span>
        <span class="tag">Force ×${tb.force.toFixed(2)}</span><span class="tag">Defense ×${tb.def.toFixed(3)}</span>
        ${tb.pct < 1 ? `<span class="tag">Need ${sgnPct(1 / tb.pct - 1, 0)} damage to solo</span>` : ''}</div>`);
    },
  };

  // ---- Efficiency ------------------------------------------------------------
  TABS.efficiency = {
    render() {
      return `<div class="card">
        <h2>Spec efficiency</h2>
        <p class="hint">How much each stat adds to your damage against the selected boss, and the equivalent in flat main stat (not affected by %).
          IED is worth more against 380% PDR bosses.</p>
        <div class="form" style="max-width:420px">${sel('s:refBoss', 'Reference boss', bossOptions())}</div>
        <div class="tablewrap" data-out="effTable" style="margin-top:10px"></div>
      </div>
      <div class="grid g2" style="margin-top:14px">
        <div class="card"><h2>Seed ring efficiency</h2><p class="hint">Average damage gain over a fight, assuming Restraint-style rings are used in burst.
          Burst settings are on the Character tab.</p><div class="tablewrap" data-out="ringTable"></div></div>
        <div class="card"><h2>Conversions</h2><div data-out="conv"></div></div>
      </div>`;
    },
    outputs() {
      const boss = C.bossById(state, state.refBoss);
      const rows = C.efficiencyTable(state, boss);
      const bossRow = rows[0];
      out('effTable', `<table><thead><tr><th>Stat</th><th>Damage gain</th><th>= flat main stat</th><th>vs 1% Boss</th><th class="l"></th></tr></thead><tbody>
        ${rows.map((r) => `<tr><td>${esc(r.label)}</td><td class="${r.gain > 0 ? 'pos' : 'muted'}">${sgnPct(r.gain, 3)}</td><td>${int(r.mainEq)}</td>
          <td>${bossRow.gain > 0 ? (r.gain / bossRow.gain).toFixed(2) + '×' : '—'}</td>
          <td class="l"><div class="bar" style="min-width:160px"><span class="bg-solo" style="width:${Math.min(100, r.gain / Math.max(...rows.map((x) => x.gain)) * 100)}%"></span></div></td></tr>`).join('')}
        </tbody></table>`);
      const rings = C.ringTable(state);
      out('ringTable', `<table><thead><tr><th>Ring</th><th>Lv</th><th>Avg gain</th><th>= main stat</th></tr></thead><tbody>
        ${rings.map((r) => `<tr><td>${esc(r.label)}${r.approx ? ' <span class="tag approx">approx</span>' : ''}</td><td>${r.level}</td><td>${sgnPct(r.gain)}</td>
          <td>${int(C.mainStatEquivalent(state, boss, r.gain / C.ringFactor(state)))}</td></tr>`).join('')}</tbody></table>`);
      const g = (d) => C.gainOf(state, boss, d);
      const ied1 = g({ ied: [0.01] }), boss1 = g({ boss: 0.01 }), att1 = g({ attFlat: 1 }), stat1 = g({ mainPct: 0.01 }), cd1 = g({ cd: 0.01 });
      out('conv', `<table><tbody>
        <tr><td>1% IED</td><td>= ${(ied1 / boss1).toFixed(2)}% Boss</td></tr>
        <tr><td>1% Crit Damage</td><td>= ${(cd1 / boss1).toFixed(2)}% Boss</td></tr>
        <tr><td>1% ATT</td><td>= ${(g({ attPct: 0.01 }) / att1).toFixed(1)} flat ATT</td></tr>
        <tr><td>1% Stat</td><td>= ${(stat1 / g({ mainFlat: 1 })).toFixed(0)} flat stat (%-affected)</td></tr>
        <tr><td>1 flat ATT</td><td>= ${(att1 / g({ mainFlat: 1 })).toFixed(1)} flat stat (%-affected)</td></tr>
        <tr><td>1% Boss</td><td>= ${(boss1 / stat1).toFixed(2)}% Stat</td></tr>
        <tr><td>Potential line equivalence</td><td>1 line of 13% stat ≈ ${(g({ mainPct: 0.13 }) / boss1).toFixed(1)}% Boss</td></tr>
      </tbody></table>`);
    },
  };

  // ---- Upgrades -------------------------------------------------------------
  TABS.upgrades = {
    render() {
      const st = 's:settings.';
      const gearRows = state.gear.map((g, i) => `<tr>
        <td class="l"><input data-k="s:gear.${i}.slot" data-t="str" value="${esc(g.slot)}" style="min-width:110px"></td>
        <td>${sel(`s:gear.${i}.kind`, '', [['armor', 'Armor/Acc'], ['weapon', 'Weapon'], ['acc', 'No Star Force']])}</td>
        <td><input data-k="s:gear.${i}.level" data-t="num" type="number" value="${g.level}" style="width:70px"></td>
        <td><input data-k="s:gear.${i}.stars" data-t="num" type="number" min="0" max="30" value="${g.stars}" style="width:60px"></td>
        <td>${sel(`s:gear.${i}.potType`, '', [['stat', 'Stat %'], ['att', 'ATT %']])}</td>
        <td><input data-k="s:gear.${i}.pot" data-t="num" type="number" value="${g.pot}" style="width:60px"></td>
        <td><input data-k="s:gear.${i}.replace" data-t="num" type="number" value="${g.replace}" style="width:120px" title="Mesos to replace the item if it booms"></td>
        <td><button class="btn ghost small" data-act="gearDel" data-v="${i}">✕</button></td></tr>`).join('');
      return `
      <div class="grid g2">
        <div class="card">
          <h2>Upgrade settings</h2>
          <div class="form">
            ${sel('s:targetBoss', 'Rank by damage vs', bossOptions())}
            ${sel(st + 'cube', 'Potential reroll', Object.entries(D.CUBES).map(([k, c]) => [k, c.label]))}
            ${inp(st + 'cubeCost', 'Mesos per reroll', { approx: true, title: 'Cube price or meso reset cost on your server' })}
            ${sel(st + 'mvp', 'MVP discount (<17★)', [['none', 'None'], ['silver', 'Silver 3%'], ['gold', 'Gold 5%'], ['diamond', 'Diamond+ 10%']])}
            ${inp(st + 'famRerollCost', 'Mesos per familiar reroll', { approx: true })}
            ${inp(st + 'famLineChance', 'Chance a line hits the target (%)', { approx: true, title: 'Nexon has not published familiar line rates since v.264' })}
            ${inp(st + 'fragPrice', 'Mesos per Sol Erda fragment (0 = time-gated)')}
            ${inp(st + 'symbolCost', 'Mesos per authentic symbol level (0 = time-gated)')}
            ${inp(st + 'hyperResetCost', 'Hyper stat reset fee')}
          </div>
          <div class="row" style="margin-top:10px">
            ${chk(st + 'starCatch', 'Star catching (+5%)')} ${chk(st + 'sfEvent30', '30% off event')} ${chk(st + 'sfBoomReduce', '-30% boom event (<21★)')}
            ${chk(st + 'safeguard', 'Safeguard 15–17★')} ${chk(st + 'keepOnBoom', 'Booms keep stars (restore ≤22★)')}
          </div>
        </div>
        <div class="card">
          <h2>Gear sheet</h2>
          <p class="hint">Stars and main-potential total for each item. These drive the Star Force and Potential suggestions.</p>
          <div class="tablewrap" style="max-height:380px;overflow:auto"><table><thead><tr><th class="l">Slot</th><th>Type</th><th>Lv</th><th>★</th><th>Pot</th><th>Pot %</th><th>Boom replace</th><th></th></tr></thead>
          <tbody>${gearRows}</tbody></table></div>
          <div class="row" style="margin-top:8px"><button class="btn ghost small" data-act="gearAdd">+ Add item</button>
            <button class="btn ghost small" data-act="gearReset">Reset to typical 22★ set</button></div>
        </div>
      </div>
      <div class="card" style="margin-top:14px">
        <h2>Possible upgrades: cost vs gain</h2>
        <div class="chips" style="margin-bottom:10px" data-out="candChips"></div>
        <div class="tablewrap" data-out="candTable"></div>
      </div>
      <div class="grid g2" style="margin-top:14px">
        <div class="card"><h2>Free &amp; time-gated upgrades</h2><div class="tablewrap" data-out="freeTable"></div></div>
        <div class="card">
          <h2>Budget planner</h2>
          <p class="hint">Greedy plan: keeps buying the upgrade with the best gain per meso and re-checks after every purchase.</p>
          <div class="form" style="max-width:360px">${inp('s:settings.budget', 'Budget (mesos)')}</div>
          <div class="row" style="margin-top:8px"><button class="btn" data-act="plan">Build plan</button></div>
          <div class="tablewrap" data-out="planTable" style="margin-top:10px"></div>
        </div>
      </div>`;
    },
    outputs() {
      const boss = C.bossById(state, state.targetBoss);
      const all = C.upgradeCandidates(state, boss);
      const paid = all.filter((c) => c.cost > 0 && c.gain > 1e-7);
      const free = all.filter((c) => !(c.cost > 0) && c.gain > 1e-7);
      const cats = ['all', ...new Set(paid.map((c) => c.cat))];
      out('candChips', cats.map((c) => `<button class="chip${ui.candFilter === c ? ' on' : ''}" data-act="candFilter" data-v="${esc(c)}">${c === 'all' ? 'All' : esc(c)}</button>`).join(''));
      // Merge identical upgrades on different slots (e.g. twelve 27%→30% armor pieces) into one row.
      const groups = new Map();
      for (const c of paid.filter((x) => ui.candFilter === 'all' || x.cat === ui.candFilter)) {
        const [slot, what] = c.label.includes(': ') ? [c.label.slice(0, c.label.indexOf(': ')), c.label.slice(c.label.indexOf(': ') + 2)] : ['', c.label];
        const key = [c.cat, what, Math.round(c.cost / 1e5), c.gain.toFixed(5)].join('|');
        const g = groups.get(key);
        if (g) g.slots.push(slot); else groups.set(key, Object.assign({}, c, { what, slots: slot ? [slot] : [] }));
      }
      const list = [...groups.values()].map((c) => Object.assign(c, {
        label: c.slots.length > 1 ? `${c.slots.length}× ${c.what} (${c.slots.join(', ')})` : c.label,
      })).sort((a, b) => b.eff - a.eff).slice(0, 50);
      let simBudget = 12;
      out('candTable', list.length ? `<table><thead><tr><th>Upgrade</th><th>Type</th><th>Expected cost</th><th>Median / 90%</th><th>Damage gain</th><th>= main stat</th><th>Gain per 1B</th><th class="l">Unlocks</th><th class="l">Notes</th></tr></thead><tbody>
        ${list.map((c) => {
          let dist = '—';
          if (c.sim && simBudget-- > 0) {
            const m = C.sfSimulate(c.sim.level, c.sim.from, c.sim.to, c.sim.opts, c.sim.replace, 600);
            dist = `${big(m.p50)} / ${big(m.p90)}`;
          }
          return `<tr><td class="wrap" style="min-width:220px">${esc(c.label)}</td><td><span class="tag">${esc(c.cat)}</span></td><td>${big(c.cost)}</td><td class="muted">${dist}</td>
            <td class="pos">${sgnPct(c.gain)}</td><td>${int(C.mainStatEquivalent(state, boss, c.gain))}</td><td><b>${sgnPct(c.eff, 3)}</b></td>
            <td class="l wrap">${c.unlocks.length ? '<span class="pos">' + esc(c.unlocks.slice(0, 2).join(', ')) + (c.unlocks.length > 2 ? '…' : '') + '</span>' : ''}</td>
            <td class="l wrap muted">${esc(c.note || '')}</td></tr>`;
        }).join('')}</tbody></table>` : '<p class="hint">No paid upgrades found. Check the gear sheet and settings.</p>');
      out('freeTable', free.length ? `<table><thead><tr><th>Upgrade</th><th>Gain</th><th>= main stat</th><th class="l">Cost</th></tr></thead><tbody>
        ${free.sort((a, b) => b.gain - a.gain).map((c) => `<tr><td class="wrap">${esc(c.label)}</td><td class="pos">${sgnPct(c.gain)}</td>
          <td>${int(C.mainStatEquivalent(state, boss, c.gain))}</td><td class="l muted wrap">${esc(c.note || '')}</td></tr>`).join('')}</tbody></table>` : '<p class="hint">Nothing free to gain right now.</p>');
      if (ui.budget) {
        const p = ui.budget;
        out('planTable', p.steps.length ? `<table><thead><tr><th>#</th><th>Upgrade</th><th>Cost</th><th>Gain</th><th>Total gain</th></tr></thead><tbody>
          ${p.steps.map((s, i) => `<tr><td>${i + 1}</td><td class="l wrap">${esc(s.label)}</td><td>${big(s.cost)}</td><td class="pos">${sgnPct(s.gain)}</td><td>${sgnPct(s.cumGain)}</td></tr>`).join('')}
          <tr><td></td><td class="l"><b>Total</b></td><td><b>${big(p.spent)}</b></td><td></td><td class="pos"><b>${sgnPct(p.gain)}</b></td></tr></tbody></table>
          <p class="hint">Target boss after plan: <b>${pct(C.bossEstimate(p.finalState, boss).pct, 0)}</b> (now ${pct(C.bossEstimate(state, boss).pct, 0)}).</p>`
          : '<p class="hint">Nothing affordable in this budget.</p>');
      } else out('planTable', '');
    },
  };

  // ---- Optimize --------------------------------------------------------------
  TABS.optimize = {
    render() {
      return `<div class="card"><div class="form" style="max-width:420px">${sel('s:targetBoss', 'Optimize for', bossOptions())}</div></div>
      <div class="grid g2" style="margin-top:14px">
        <div class="card"><h2>Hyper Stat optimizer</h2><div data-out="hyperOpt"></div></div>
        <div class="card"><h2>Legion board optimizer</h2><div data-out="legionOpt"></div></div>
      </div>
      <div class="card" style="margin-top:14px"><h2>Familiar upgrades</h2><div data-out="famOpt"></div></div>`;
    },
    outputs() {
      const boss = C.bossById(state, state.targetBoss);
      const hy = C.hyperOptimize(state, boss);
      out('hyperOpt', `<table><thead><tr><th>Stat</th><th>Current</th><th>Optimal</th></tr></thead><tbody>
        ${Object.entries(D.HYPER_STATS).map(([k, d]) => `<tr><td>${esc(d.label)}</td><td>${state.hyper[k] || 0}</td>
          <td class="${hy.alloc[k] > (state.hyper[k] || 0) ? 'pos' : hy.alloc[k] < (state.hyper[k] || 0) ? 'neg' : ''}"><b>${hy.alloc[k]}</b></td></tr>`).join('')}
        </tbody></table>
        <p class="hint">Points: ${hy.used} / ${hy.budget} · Gain: <b class="pos">${sgnPct(hy.gain)}</b></p>
        <button class="btn small" data-act="applyHyper" ${hy.gain > 1e-6 ? '' : 'disabled'}>Apply (updates stat window)</button>`);
      const lg = C.legionOptimize(state, boss);
      out('legionOpt', `<table><thead><tr><th>Region</th><th>Current</th><th>Optimal</th></tr></thead><tbody>
        ${Object.entries(D.LEGION_REGIONS).map(([k, d]) => `<tr><td>${esc(d.label)}</td><td>${state.legion[k] || 0}</td>
          <td class="${lg.alloc[k] > (state.legion[k] || 0) ? 'pos' : lg.alloc[k] < (state.legion[k] || 0) ? 'neg' : ''}"><b>${lg.alloc[k]}</b></td></tr>`).join('')}
        </tbody></table>
        <p class="hint">Cells: ${lg.budget} · Gain: <b class="pos">${sgnPct(lg.gain)}</b>. Board shape is not checked, so make sure the pieces actually fit.</p>
        <button class="btn small" data-act="applyLegion" ${lg.gain > 1e-6 ? '' : 'disabled'}>Apply (updates stat window)</button>`);
      const fo = C.familiarOptions(state, boss).map((f) => Object.assign(f, { gain: C.gainOf(state, boss, f.delta) })).sort((a, b) => b.gain - a.gain);
      const rawBoss = C.familiarBossRaw(state.familiars);
      out('famOpt', `<p class="hint">Familiar boss now: ${pct(Math.min(rawBoss, D.FAMILIAR_BOSS_CAP), 0)} of the 120% cap. Once you hit the cap, put the remaining lines into IED.</p>
        <table><thead><tr><th>Change</th><th>Gain</th><th>= main stat</th><th>Expected rerolls</th><th>Expected cost</th></tr></thead><tbody>
        ${fo.map((f) => `<tr><td class="wrap">${esc(f.label)}${f.capped ? ' <span class="tag approx">over cap</span>' : ''}</td><td class="${f.gain > 0 ? 'pos' : 'muted'}">${sgnPct(f.gain)}</td>
          <td>${int(C.mainStatEquivalent(state, boss, f.gain))}</td><td>${int(f.rerolls)}</td><td>${big(f.cost)}</td></tr>`).join('')}
        </tbody></table>`);
    },
  };

  // ---- HEXA ------------------------------------------------------------------
  TABS.hexa = {
    render() {
      const rows = state.hexa.map((c, i) => `<tr>
        <td class="l"><input data-k="s:hexa.${i}.name" data-t="str" value="${esc(c.name)}" style="min-width:150px"></td>
        <td>${sel(`s:hexa.${i}.kind`, '', [['origin', 'Origin'], ['mastery', 'Mastery'], ['enhance', 'Enhancement'], ['common', 'Common']])}</td>
        <td><input data-k="s:hexa.${i}.level" data-t="num" type="number" min="0" max="30" value="${c.level}" style="width:70px"></td>
        <td><input data-k="s:hexa.${i}.share" data-t="num" type="number" min="0" max="100" value="${c.share}" style="width:80px"></td>
        <td data-out="hexaRow${i}"></td></tr>`).join('');
      return `<div class="grid g2">
        <div class="card"><h2>HEXA Matrix</h2>
          <p class="hint">Set each core's level and its share of your total boss damage (from in-game <b>Battle Analysis</b>). Enhancement cores boost
            your 5th job skills, so use those skills' share. Each core's growth per level is approximated.</p>
          <div class="row" style="margin-bottom:8px">${chk('s:useHexa', 'Include HEXA progress in scores and boss estimates')}</div>
          <div class="tablewrap"><table><thead><tr><th class="l">Core</th><th>Type</th><th>Level</th><th>Damage share %</th><th>Next level</th></tr></thead><tbody>${rows}</tbody></table></div>
        </div>
        <div class="card"><h2>Optimal upgrade order</h2><div data-out="hexaPlan"></div></div>
      </div>`;
    },
    outputs() {
      state.hexa.forEach((c, i) => {
        const cost = C.hexaStepCost(c), g = C.hexaStepGain(c);
        out('hexaRow' + i, cost ? `<span class="pos">${sgnPct(g)}</span> <span class="muted">for ${cost.frag} frag · ${(g / cost.frag * 1e4).toFixed(2)}‱/frag</span>` : '<span class="muted">max</span>');
      });
      const plan = C.hexaPlan(state.hexa, 25);
      let fr = 0, er = 0, cum = 0;
      out('hexaPlan', `<p class="hint">HEXA factor now ×${C.hexaFactor(state.hexa).toFixed(3)}. Next 25 upgrades, ordered by damage per fragment:</p>
        <table><thead><tr><th>#</th><th class="l">Core</th><th>Level</th><th>Gain</th><th>Frags</th><th>Total frags</th><th>Total gain</th></tr></thead><tbody>
        ${plan.map((p, i) => { fr += p.frag; er += p.erda; cum = (1 + cum) * (1 + p.gain) - 1;
          return `<tr><td>${i + 1}</td><td class="l">${esc(p.name)}</td><td>${p.from}→${p.to}</td><td class="pos">${sgnPct(p.gain)}</td><td>${p.frag}</td><td>${int(fr)}</td><td>${sgnPct(cum)}</td></tr>`; }).join('')}
        </tbody></table><p class="hint">Total: ${int(fr)} fragments, ${int(er)} Sol Erda.</p>`);
    },
  };

  // ---- Item Maker -----------------------------------------------------------
  const ITEM_FIELDS = [
    ['mainFlat', 'Main stat (flat)'], ['mainPct', 'Main stat %'], ['allPct', 'All stat %'], ['subFlat', 'Sub stat (flat)'],
    ['attFlat', 'ATT (flat)'], ['attPct', 'ATT %'], ['boss', 'Boss %'], ['ied', 'IED %'], ['dmg', 'Damage %'], ['cd', 'Crit Damage %'], ['cr', 'Crit Rate %'],
  ];
  function itemDelta(o, n) {
    const d = C.emptyDelta();
    const g = (x, k) => Number(x[k]) || 0;
    d.mainFlat = g(n, 'mainFlat') - g(o, 'mainFlat');
    d.mainPct = (g(n, 'mainPct') + g(n, 'allPct') - g(o, 'mainPct') - g(o, 'allPct')) / 100;
    d.subFlat = g(n, 'subFlat') - g(o, 'subFlat');
    d.attFlat = g(n, 'attFlat') - g(o, 'attFlat');
    d.attPct = (g(n, 'attPct') - g(o, 'attPct')) / 100;
    d.boss = (g(n, 'boss') - g(o, 'boss')) / 100;
    d.dmg = (g(n, 'dmg') - g(o, 'dmg')) / 100;
    d.cd = (g(n, 'cd') - g(o, 'cd')) / 100;
    d.cr = (g(n, 'cr') - g(o, 'cr')) / 100;
    if (g(o, 'ied')) d.ied.push(-g(o, 'ied') / 100);
    if (g(n, 'ied')) d.ied.push(g(n, 'ied') / 100);
    return d;
  }
  TABS.itemmaker = {
    render() {
      const col = (which) => `<div class="form">${ITEM_FIELDS.map(([k, l]) => inp(`u:${which}.${k}`, l)).join('')}</div>`;
      return `<div class="grid g2">
        <div class="card"><h2>Current item (being replaced)</h2><p class="hint">Enter only the lines that differ between the two items (stars, flames, potential, set effects).</p>${col('itemOld')}</div>
        <div class="card"><h2>New item</h2><p class="hint">IED replaces correctly: the old source is removed and the new one added multiplicatively.</p>${col('itemNew')}</div>
      </div>
      <div class="grid g2" style="margin-top:14px">
        <div class="card"><h2>Result</h2><div data-out="itemResult"></div></div>
        <div class="card"><h2>Add to upgrade list</h2>
          <div class="form">${inp('u:itemLabel', 'Label', { type: 'str' })}${inp('u:itemCost', 'Cost (mesos)')}</div>
          <div class="row" style="margin-top:10px"><button class="btn" data-act="itemAdd">Add as custom upgrade</button><button class="btn ghost" data-act="itemApply">Apply to my stats</button>
            <button class="btn ghost" data-act="itemClear">Clear</button></div>
          <div data-out="customList" style="margin-top:10px"></div>
        </div>
      </div>`;
    },
    outputs() {
      const d = itemDelta(ui.itemOld, ui.itemNew);
      const boss = C.bossById(state, state.targetBoss);
      const g = C.gainOf(state, boss, d);
      const S0 = C.effective(state), S1 = C.effective(state, d);
      const before = C.bossTable(state), after = C.bossTable(state, d);
      const changed = after.filter((r, i) => r.status !== before[i].status);
      out('itemResult', `<div class="kpis" style="margin:0 0 10px">
        <div class="kpi"><div class="k">Score</div><div class="v" style="font-size:20px">${int(C.score(S0))} → ${int(C.score(S1))}</div></div>
        <div class="kpi"><div class="k">Damage vs ${esc(boss.name)}</div><div class="v ${g >= 0 ? 'pos' : 'neg'}" style="font-size:20px">${sgnPct(g)}</div>
          <div class="s">≈ ${int(C.mainStatEquivalent(state, boss, g))} main stat</div></div></div>
        ${changed.length ? `<table><thead><tr><th>Boss</th><th>Before</th><th>After</th></tr></thead><tbody>${changed.map((r) => {
          const b = before.find((x) => x.boss.id === r.boss.id);
          return `<tr><td>${esc(r.boss.name)}</td><td class="st-${b.status}">${pct(b.pct, 0)} ${STATUS_LABEL[b.status]}</td><td class="st-${r.status}">${pct(r.pct, 0)} ${STATUS_LABEL[r.status]}</td></tr>`;
        }).join('')}</tbody></table>` : '<p class="hint">No boss changes status.</p>'}`);
      out('customList', (state.custom || []).length ? `<table><tbody>${state.custom.map((c, i) => `<tr><td class="l">${esc(c.label)}</td><td>${big(c.cost)}</td>
        <td><button class="btn ghost small" data-act="customDel" data-v="${i}">✕</button></td></tr>`).join('')}</tbody></table>` : '<p class="hint">No custom upgrades yet.</p>');
    },
  };

  // ---- Star Force -------------------------------------------------------------
  TABS.starforce = {
    render() {
      const st = 's:settings.';
      return `<div class="grid g2">
        <div class="card"><h2>Star Force calculator <span class="tag">GMS 2025+ rates</span></h2>
          <div class="form">
            ${inp('u:sf.level', 'Item level', { step: 1 })}${inp('u:sf.from', 'Current ★', { step: 1, min: 0, max: 29 })}
            ${inp('u:sf.to', 'Target ★', { step: 1, min: 1, max: 30 })}${inp('u:sf.replace', 'Mesos to replace on boom')}
            ${sel(st + 'mvp', 'MVP discount', [['none', 'None'], ['silver', 'Silver 3%'], ['gold', 'Gold 5%'], ['diamond', 'Diamond+ 10%']])}
          </div>
          <div class="row" style="margin-top:10px">
            ${chk(st + 'starCatch', 'Star catching')} ${chk(st + 'sfEvent30', '30% off')} ${chk(st + 'sfBoomReduce', '-30% boom (<21★)')}
            ${chk(st + 'safeguard', 'Safeguard 15–17★')} ${chk(st + 'keepOnBoom', 'Booms keep stars (≤22★)')}
          </div>
          <div data-out="sfSummary" style="margin-top:12px"></div>
        </div>
        <div class="card"><h2>Per-star breakdown</h2><div class="tablewrap" data-out="sfTable"></div></div>
      </div>`;
    },
    outputs() {
      const s = state.settings;
      const o = { sfEvent30: s.sfEvent30, sfBoomReduce: s.sfBoomReduce, starCatch: s.starCatch, mvp: s.mvp, safeguard: s.safeguard, keepOnBoom: s.keepOnBoom };
      const lv = Number(ui.sf.level) || 200, f = Math.max(0, Number(ui.sf.from) || 0), t = Math.min(C.sfMaxStars(lv), Number(ui.sf.to) || 0);
      const e = C.sfExpected(lv, f, t, o, Number(ui.sf.replace) || 0);
      const m = C.sfSimulate(lv, f, t, o, Number(ui.sf.replace) || 0, 2000);
      out('sfSummary', `<div class="kpis" style="margin:0">
        <div class="kpi main"><div class="k">Expected cost</div><div class="v">${big(e.cost)}</div><div class="s">${f}★ → ${t}★ (max ${C.sfMaxStars(lv)}★)</div></div>
        <div class="kpi"><div class="k">Median / 90% luck</div><div class="v" style="font-size:20px">${big(m.p50)} / ${big(m.p90)}</div><div class="s">2,000 simulations</div></div>
        <div class="kpi"><div class="k">Expected booms</div><div class="v">${e.booms.toFixed(2)}</div><div class="s">${e.attempts.toFixed(1)} taps</div></div></div>`);
      const rows = [];
      for (let k = f; k < t; k++) {
        const a = C.sfAttempt(lv, k, o);
        const step = C.sfExpected(lv, k, k + 1, o, Number(ui.sf.replace) || 0);
        rows.push(`<tr><td>${k}★ → ${k + 1}★</td><td>${big(a.cost)}</td><td>${pct(a.p, 2)}</td><td>${pct(a.b, 2)}</td><td>${big(step.cost)}</td><td>${step.booms.toFixed(2)}</td></tr>`);
      }
      out('sfTable', `<table><thead><tr><th>Step</th><th>Per tap</th><th>Success</th><th>Boom</th><th>Expected (incl. booms)</th><th>Booms</th></tr></thead><tbody>${rows.join('')}</tbody></table>
        <p class="hint">Per-step "expected" includes rebuilding from 12★ after a boom (unless booms keep stars), so the steps don't add up to the total.</p>`);
    },
  };

  // ---- Mu Lung ---------------------------------------------------------------
  TABS.dojo = {
    render() { return `<div class="card"><h2>Mu Lung Dojo estimate <span class="tag approx">experimental</span></h2>
      <p class="hint">Uses a 15-minute timer, a floor HP curve that grows ~20% per floor, and 2s of travel per floor. Treat it as a rough bracket,
      and calibrate on the Scouter tab first.</p><div data-out="dojo"></div></div>`; },
    outputs() {
      const e = C.dojoEstimate(state);
      out('dojo', `<div class="kpis"><div class="kpi main"><div class="k">Estimated floor</div><div class="v">${e.floor}F</div><div class="s">${dur(e.time)} used</div></div></div>
        <table><thead><tr><th>Floor</th><th>Floor HP (model)</th></tr></thead><tbody>
        ${[-2, -1, 0, 1, 2, 3].map((k) => e.floor + k).filter((n) => n >= 1).map((n) => `<tr><td>${n}F</td><td>${big(C.dojoFloorHp(n))}</td></tr>`).join('')}</tbody></table>`);
    },
  };

  // ---- Compare -------------------------------------------------------------
  TABS.compare = {
    render() {
      return `<div class="card"><h2>Saved characters</h2>
        <p class="hint">Saved in this browser. Use <b>Share link</b> to send a character to someone else.</p>
        <div class="row"><button class="btn" data-act="saveAs">Save current as "${esc(state.name)}"</button>
          <button class="btn ghost" data-act="newChar">New blank character</button></div>
        <div class="tablewrap" data-out="savedTable" style="margin-top:12px"></div></div>
        <div class="card" style="margin-top:14px"><h2>Import / export</h2>
          <textarea id="ioBox" style="width:100%;min-height:120px;background:var(--panel2);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:8px;font-family:ui-monospace,monospace"></textarea>
          <div class="row" style="margin-top:8px"><button class="btn ghost" data-act="export">Export current</button><button class="btn" data-act="import">Import</button></div></div>`;
    },
    outputs() {
      const saved = loadSaved();
      const names = Object.keys(saved);
      const boss = C.bossById(state, state.targetBoss);
      const rowsFor = (name, s, isCur) => {
        const S = C.effective(s);
        const rows = C.bossTable(s);
        const top = rows.filter((r) => r.pct >= 1).sort((a, b) => b.boss.hp - a.boss.hp)[0];
        return `<tr><td class="l">${isCur ? '<b>Current</b>' : esc(name)}</td><td>${esc((D.CLASSES.find((c) => c.id === s.cls) || {}).name || '')}</td><td>${s.level}</td>
          <td><b>${int(C.score(S))}</b></td><td>${int(C.hexaScore(s, S))}</td><td>${int(S.main)}</td><td>${int(S.att)}</td><td>${pct(S.db, 0)}</td><td>${pct(S.ied, 1)}</td>
          <td>${top ? esc(top.boss.name) : '—'}</td><td>${pct(C.bossEstimate(s, boss).pct, 0)}</td>
          <td>${isCur ? '' : `<button class="btn ghost small" data-act="load" data-v="${esc(name)}">Load</button> <button class="btn ghost small" data-act="del" data-v="${esc(name)}">✕</button>`}</td></tr>`;
      };
      out('savedTable', `<table><thead><tr><th class="l">Name</th><th>Class</th><th>Lv</th><th>Score</th><th>HEXA</th><th>Main</th><th>ATT</th><th>Dmg+Boss</th><th>IED</th><th>Top solo boss</th><th>${esc(boss.name)}</th><th></th></tr></thead>
        <tbody>${rowsFor('', state, true)}${names.map((n) => rowsFor(n, C.mergeState(saved[n]), false)).join('')}</tbody></table>`);
    },
  };

  // ---- Data -------------------------------------------------------------------
  TABS.data = {
    render() {
      const rows = C.bossList(state).map((b) => {
        const custom = (state.customBosses || []).some((x) => x.id === b.id);
        const f = (k, v, w, scale) => `<input data-boss="${esc(b.id)}" data-f="${k}" data-scale="${scale || 1}" type="number" step="any" value="${esc(v)}" style="width:${w}px">`;
        return `<tr><td>${esc(b.name)}${custom ? ' <span class="tag">custom</span>' : ''}</td><td>${f('level', b.level, 64)}</td><td>${f('pdr', Math.round(b.pdr * 100), 64, 0.01)}</td>
          <td>${b.force ? b.force.toUpperCase() : '—'}</td><td>${f('req', b.req, 70)}</td><td>${f('hp', +(b.hp / 1e12).toFixed(3), 100, 1e12)}</td><td>${f('time', b.time, 56)}</td>
          <td>${custom ? `<button class="btn ghost small" data-act="bossDel" data-v="${esc(b.id)}">✕</button>` : ''}</td></tr>`;
      }).join('');
      return `<div class="card"><h2>Boss data <span class="tag">editable</span></h2>
        <p class="hint">Boss HP in trillions (T), PDR in %. Edits are saved with your character. ≈ marks values from older or uncertain sources; correct them after a patch.</p>
        <div class="row" style="margin-bottom:8px"><button class="btn ghost small" data-act="bossReset">Reset all edits</button></div>
        <div class="tablewrap"><table><thead><tr><th>Boss</th><th>Lv</th><th>PDR %</th><th>Force</th><th>Req</th><th>HP (T)</th><th>Time (min)</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></div>
        <div class="card" style="margin-top:14px"><h2>Add custom boss</h2>
          <div class="form">
            <div class="field"><label>Name</label><input id="nbName" value="Custom Boss"></div>
            <div class="field"><label>Level</label><input id="nbLv" type="number" value="285"></div>
            <div class="field"><label>PDR %</label><input id="nbPdr" type="number" value="380"></div>
            <div class="field"><label>Force</label><select id="nbForce"><option value="sac">Sacred</option><option value="arc">Arcane</option><option value="">None</option></select></div>
            <div class="field"><label>Requirement</label><input id="nbReq" type="number" value="300"></div>
            <div class="field"><label>Total HP (T)</label><input id="nbHp" type="number" value="1000"></div>
            <div class="field"><label>Time limit (min)</label><input id="nbTime" type="number" value="30"></div>
          </div><div class="row" style="margin-top:8px"><button class="btn" data-act="bossAdd">Add boss</button></div></div>`;
    },
    outputs() {},
  };

  // ---- Guide -----------------------------------------------------------------
  TABS.about = {
    render() {
      return `<div class="grid g2 prose">
      <div class="card"><h2>How to use</h2><ol>
        <li><b>Character</b>: copy your unbuffed stat window. Fill in the stat breakdown roughly (total stat %, ATT %, Arcane/Sacred Power).</li>
        <li><b>Familiars</b>: pick a preset or set tier and line type. Values fill in automatically, and the 120% familiar boss cap is applied.</li>
        <li><b>Scouter &amp; Bosses</b>: shows your Scouter Score and estimated % per boss. Calibrate with one real solo clear time for accuracy.</li>
        <li><b>Efficiency</b>: what 1% Boss, IED, Crit Damage, ATT and stat are worth to you, in main-stat terms.</li>
        <li><b>Upgrades</b>: every Star Force, Potential, Familiar, HEXA, Hyper and Legion upgrade, with expected meso cost, damage gain, gain per 1B, and the bosses it unlocks.</li>
        <li><b>Item Maker</b>: compare two items line by line and see the result before you buy.</li>
      </ol></div>
      <div class="card"><h2>Formulas</h2>
        <div class="formula">statValue   = 4 × Main + Sub
Damage      ∝ statValue × ATT × (1 + Dmg% + Boss%) × FD
              × (1 + CritRate × (35% + CritDmg))
              × max(0, 1 − PDR × (1 − IED))
              × Force × LevelDiff
IED stacking: 1 − Π(1 − source)
Scouter Score = Main-stat equivalent vs a 300% PDR boss, normalised
  to ATT 2000 · 300% Dmg+Boss · 80% CD · 90% IED.
Boss %  = DPS × time limit ÷ boss HP
DPS     = HEXA score × ring × force × level × class × calibration × k</div>
        <p class="hint">Sacred Power: −10% per 10 below the requirement, +5% per 10 above (max +25%). Arcane: 150% / 130% / 110% / 100% / 80% / 50% / 10%
          bands by ratio. Level: 110% at equal level, +2%/level up to +5, −2.5%/level below.</p></div>
      <div class="card"><h2>Data sources &amp; caveats</h2><ul>
        <li>Boss HP, PDR and Sacred Power requirements: MapleHub / maplerhouse boss tables and MapleStory Wiki boss pages (2026). Older bosses are approximate (≈).</li>
        <li>Familiars: Nexon Maple Memo (Unique Boss = 40% only), and MapleStory Wiki (120% familiar boss cap). Nexon has not published line rates since v.264, so reroll odds are your own input.</li>
        <li>Star Force: success/boom table for the 2025+ system (MapleStory Wiki), base meso formula with GMS level rounding. Exact 23★+ ATT values are estimates.</li>
        <li>Cube line odds and prices, HEXA growth per level, seed ring effects other than Restraint, and Mu Lung floors are approximations. Every price is an input.</li>
        <li>MapleScouter (KMS) reads gear from Nexon's KMS Open API. GMS has no equivalent public API, so this tool uses manual entry, presets and share links instead.</li>
      </ul></div>
      <div class="card"><h2>Feature map vs MapleScouter</h2><table><tbody>
        <tr><td class="l">환산 주스탯 (converted stat)</td><td class="l">Scouter Score + HEXA Score</td></tr>
        <tr><td class="l">보스컷 (boss cut %)</td><td class="l">Scouter &amp; Bosses tab, with calibration</td></tr>
        <tr><td class="l">스펙 효율 (efficiency)</td><td class="l">Efficiency tab</td></tr>
        <tr><td class="l">시드링 효율 (seed rings)</td><td class="l">Efficiency tab → seed rings</td></tr>
        <tr><td class="l">스펙 최적화 (hyper / legion)</td><td class="l">Optimize tab + familiars</td></tr>
        <tr><td class="l">HEXA 최적화</td><td class="l">HEXA tab</td></tr>
        <tr><td class="l">아이템 메이커</td><td class="l">Item Maker tab</td></tr>
        <tr><td class="l">무릉 예상 층수</td><td class="l">Mu Lung tab</td></tr>
        <tr><td class="l">도핑 (buff toggle)</td><td class="l">Character → Bossing buffs</td></tr>
        <tr><td class="l">랭킹 / 캐릭터 검색</td><td class="l">Saved &amp; Compare, share links</td></tr>
        <tr><td class="l">GMS extras</td><td class="l">Upgrade cost vs gain, budget planner, Star Force simulator, familiar optimizer</td></tr>
      </tbody></table></div></div>`;
    },
    outputs() {},
  };

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------
  const app = document.getElementById('app');
  function out(name, html) {
    const el = app.querySelector(`[data-out="${name}"]`);
    if (el) el.innerHTML = html;
  }
  function renderTab() {
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === ui.tab));
    app.innerHTML = TABS[ui.tab].render();
    refresh();
  }
  let raf = 0;
  function refresh() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      try { TABS[ui.tab].outputs(); } catch (e) { console.error(e); }
      if (ui.tab !== 'scouter') {
        const sc = C.score(C.effective(state));
        document.getElementById('headerScore').textContent = `${state.name || ''} · Score ${int(sc)}`;
      }
    });
  }
  function persist() { store.set(LS_CUR, JSON.stringify(state)); }
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 1800);
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------
  function onField(e) {
    const el = e.target;
    if (el.dataset.boss) return onBossField(el);
    const key = el.dataset.k;
    if (!key) return;
    const t = el.dataset.t;
    let v = t === 'bool' ? el.checked : t === 'num' ? (el.value === '' ? 0 : Number(el.value)) : el.value;
    if (t === 'num' && !isFinite(v)) return;
    const [o, p] = resolve(key);
    setPath(o, p, v);
    // Familiar tier/type change → auto-fill line values with the tier's best roll
    const fm = p.match(/^familiars\.(\d+)\.(tier|lines\.(\d+)\.type)$/);
    if (fm && e.type === 'change') {
      const f = state.familiars[+fm[1]];
      const lines = fm[3] != null ? [f.lines[+fm[3]]] : f.lines;
      for (const ln of lines) {
        const vals = (D.FAMILIAR_LINES[ln.type] || D.FAMILIAR_LINES.none).values[f.tier] || [0];
        ln.val = Math.max(...vals);
      }
      persist(); renderTab(); return;
    }
    if (p === 'cls' && e.type === 'change') { persist(); renderTab(); return; }
    if (p === 'settings.cube' && e.type === 'change') { state.settings.cubeCost = D.CUBES[v].cost; persist(); renderTab(); return; }
    if (o === state) persist();
    refresh();
  }
  function onBossField(el) {
    const id = el.dataset.boss, f = el.dataset.f, scale = Number(el.dataset.scale) || 1;
    const v = Number(el.value) * scale;
    if (!isFinite(v)) return;
    const cb = (state.customBosses || []).find((b) => b.id === id);
    if (cb) cb[f] = v;
    else { state.bossOverrides[id] = state.bossOverrides[id] || {}; state.bossOverrides[id][f] = v; }
    persist();
  }
  app.addEventListener('input', onField);
  app.addEventListener('change', onField);

  const ACTIONS = {
    famPreset(v) { state.familiars = C.clone(D.FAMILIAR_PRESETS[v].fams); persist(); renderTab(); },
    calibrate() {
      const f = C.calibrate(state, ui.calibBoss, Number(ui.calibMin));
      state.calib = +f.toFixed(4);
      state.calibNote = `${C.bossById(state, ui.calibBoss).name} in ${ui.calibMin} min`;
      persist(); renderTab(); toast('Calibrated');
    },
    resetCalib() { state.calib = 1; state.calibNote = ''; persist(); renderTab(); },
    candFilter(v) { ui.candFilter = v; refresh(); },
    gearAdd() { state.gear.push({ slot: 'New item', kind: 'armor', level: 200, stars: 17, potType: 'stat', pot: 21, replace: 0 }); persist(); renderTab(); },
    gearDel(v) { state.gear.splice(+v, 1); persist(); renderTab(); },
    gearReset() { state.gear = C.clone(D.GEAR_DEFAULT); persist(); renderTab(); },
    plan() {
      const boss = C.bossById(state, state.targetBoss);
      ui.budget = C.budgetPlan(state, boss, Number(state.settings.budget) || 0, 25);
      refresh();
    },
    applyHyper() {
      const boss = C.bossById(state, state.targetBoss);
      const hy = C.hyperOptimize(state, boss);
      state = Object.assign(C.bakeDelta(state, hy.delta), { hyper: hy.alloc });
      persist(); renderTab(); toast('Hyper stats applied');
    },
    applyLegion() {
      const boss = C.bossById(state, state.targetBoss);
      const lg = C.legionOptimize(state, boss);
      state = Object.assign(C.bakeDelta(state, lg.delta), { legion: lg.alloc });
      persist(); renderTab(); toast('Legion applied');
    },
    itemAdd() {
      state.custom = state.custom || [];
      state.custom.push({ label: ui.itemLabel || 'Custom upgrade', cost: Number(ui.itemCost) || 0, delta: itemDelta(ui.itemOld, ui.itemNew) });
      persist(); refresh(); toast('Added to Upgrades tab');
    },
    itemApply() { state = C.bakeDelta(state, itemDelta(ui.itemOld, ui.itemNew)); ui.itemOld = {}; ui.itemNew = {}; persist(); renderTab(); toast('Applied to stats'); },
    itemClear() { ui.itemOld = {}; ui.itemNew = {}; renderTab(); },
    customDel(v) { state.custom.splice(+v, 1); persist(); refresh(); },
    saveAs() { const m = loadSaved(); m[state.name || 'Unnamed'] = state; writeSaved(m); refresh(); toast('Saved'); },
    newChar() { state = C.defaultState(); state.name = 'New Character'; persist(); renderTab(); },
    load(v) { const m = loadSaved(); if (m[v]) { state = C.mergeState(m[v]); persist(); renderTab(); toast('Loaded ' + v); } },
    del(v) { const m = loadSaved(); delete m[v]; writeSaved(m); refresh(); },
    export() { document.getElementById('ioBox').value = JSON.stringify(state, null, 1); },
    import() {
      try { state = C.mergeState(JSON.parse(document.getElementById('ioBox').value)); persist(); renderTab(); toast('Imported'); }
      catch (e) { toast('Invalid JSON'); }
    },
    bossReset() { state.bossOverrides = {}; persist(); renderTab(); },
    bossDel(v) { state.customBosses = state.customBosses.filter((b) => b.id !== v); persist(); renderTab(); },
    bossAdd() {
      const g = (id) => document.getElementById(id).value;
      const b = { id: 'custom_' + Date.now(), name: g('nbName') || 'Custom Boss', level: +g('nbLv'), pdr: +g('nbPdr') / 100, force: g('nbForce') || null,
        req: +g('nbReq'), hp: +g('nbHp') * 1e12, time: +g('nbTime') || 30, party: 6, approx: false };
      state.customBosses = (state.customBosses || []).concat([b]);
      persist(); renderTab(); toast('Boss added');
    },
  };
  app.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const fn = ACTIONS[b.dataset.act];
    if (fn) fn(b.dataset.v);
  });
  document.getElementById('tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tab]');
    if (!b) return;
    ui.tab = b.dataset.tab;
    renderTab();
  });
  document.getElementById('btnShare').addEventListener('click', () => {
    const url = location.href.split('#')[0] + '#s=' + encodeURIComponent(C.encodeState(state));
    const done = () => toast('Share link copied');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, () => { prompt('Copy this link:', url); });
    else prompt('Copy this link:', url);
  });
  document.getElementById('btnSave').addEventListener('click', () => ACTIONS.saveAs());
  function applyTheme(t) { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }
  applyTheme(store.get(LS_THEME));
  document.getElementById('btnTheme').addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    applyTheme(cur); store.set(LS_THEME, cur);
  });

  renderTab();
})();
