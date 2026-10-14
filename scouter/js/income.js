/*
 * GMS Scouter — boss crystal income.
 *
 * Crystal prices are GMS (Interactive) figures from community lists (2026). Prices
 * drift up to ±3% weekly, so every price is editable on the Boss Income tab.
 * Limits: 14 weekly crystals per character, 180 per world (MapleStory Wiki).
 */
(function (root) {
  'use strict';
  const M = 1e6;

  // id, name, price, frequency ('weekly' | 'monthly'), group label, approx
  const RAW = [
    ['hhilla', 'Hard Hilla', 11.25 * M, 'weekly', 'Pre-Arcane', true],
    ['cygnus', 'Normal Cygnus', 9.1 * M, 'weekly', 'Pre-Arcane', true],
    ['cpb', 'Chaos Pink Bean', 14.4 * M, 'weekly', 'Pre-Arcane', true],
    ['czak', 'Chaos Zakum', 16.2 * M, 'weekly', 'Pre-Arcane', false],
    ['cqueen', 'Chaos Crimson Queen', 16.2 * M, 'weekly', 'Pre-Arcane', true],
    ['cpierre', 'Chaos Pierre', 16.2 * M, 'weekly', 'Pre-Arcane', false],
    ['cvonbon', 'Chaos Von Bon', 16.18 * M, 'weekly', 'Pre-Arcane', false],
    ['princess', 'Princess No', 15.3125 * M, 'weekly', 'Pre-Arcane', false],
    ['hmag', 'Hard Magnus', 19.0125 * M, 'weekly', 'Pre-Arcane', false],
    ['cvel', 'Chaos Vellum', 21.0125 * M, 'weekly', 'Pre-Arcane', false],
    ['cpap', 'Chaos Papulatus', 26.7 * M, 'weekly', 'Pre-Arcane', true],
    ['nlotus', 'Normal Lotus', 32.5 * M, 'weekly', 'Arcane', true],
    ['ndamien', 'Normal Damien', 30.3 * M, 'weekly', 'Arcane', true],
    ['nslime', 'Normal Guardian Angel Slime', 33 * M, 'weekly', 'Arcane', true],
    ['elucid', 'Easy Lucid', 31 * M, 'weekly', 'Arcane', true],
    ['nlucid', 'Normal Lucid', 37.5 * M, 'weekly', 'Arcane', true],
    ['ewill', 'Easy Will', 34.3 * M, 'weekly', 'Arcane', true],
    ['nwill', 'Normal Will', 43.3 * M, 'weekly', 'Arcane', true],
    ['ngloom', 'Normal Gloom', 46.9 * M, 'weekly', 'Arcane', true],
    ['ndark', 'Normal Darknell', 48.5 * M, 'weekly', 'Arcane', true],
    ['nverus', 'Normal Verus Hilla', 58 * M, 'weekly', 'Arcane', true],
    ['hdamien', 'Hard Damien', 70.3125 * M, 'weekly', 'Arcane', false],
    ['cslime', 'Chaos Guardian Angel Slime', 72.6 * M, 'weekly', 'Arcane', true],
    ['hlotus', 'Hard Lotus', 74.1125 * M, 'weekly', 'Arcane', false],
    ['hlucid', 'Hard Lucid', 80 * M, 'weekly', 'Arcane', false],
    ['hwill', 'Hard Will', 88.2 * M, 'weekly', 'Arcane', false],
    ['cgloom', 'Chaos Gloom', 92 * M, 'weekly', 'Arcane', true],
    ['hdark', 'Hard Darknell', 96.8 * M, 'weekly', 'Arcane', false],
    ['hverus', 'Hard Verus Hilla', 110.45 * M, 'weekly', 'Arcane', false],
    ['hbm', 'Hard Black Mage', 500 * M, 'monthly', 'Arcane', false],
    ['nseren', 'Normal Chosen Seren', 133.5 * M, 'weekly', 'Grandis', true],
    ['ekalos', 'Easy Kalos the Guardian', 150 * M, 'weekly', 'Grandis', true],
    ['ekaling', 'Easy Kaling', 170 * M, 'weekly', 'Grandis', true],
    ['hseren', 'Hard Chosen Seren', 219.3125 * M, 'weekly', 'Grandis', false],
    ['nkalos', 'Normal Kalos the Guardian', 330 * M, 'weekly', 'Grandis', true],
    ['nkaling', 'Normal Kaling', 345 * M, 'weekly', 'Grandis', true],
    ['nmalefic', 'Normal Radiant Malefic Star', 380 * M, 'weekly', 'Grandis', true],
    ['nlimbo', 'Normal Limbo', 420 * M, 'weekly', 'Grandis', false],
    ['ckalos', 'Chaos Kalos the Guardian', 520 * M, 'weekly', 'Grandis', false],
    ['nbaldrix', 'Normal Baldrix', 560 * M, 'weekly', 'Grandis', true],
    ['hkaling', 'Hard Kaling', 640 * M, 'weekly', 'Grandis', true],
    ['hmalefic', 'Hard Radiant Malefic Star', 700 * M, 'weekly', 'Grandis', true],
    ['hlimbo', 'Hard Limbo', 760 * M, 'weekly', 'Grandis', true],
    ['hbaldrix', 'Hard Baldrix', 980 * M, 'weekly', 'Grandis', true],
  ];
  const CRYSTALS = RAW.map(([id, name, price, freq, group, approx]) => ({ id, name, price, freq, group, approx }));
  const byId = Object.fromEntries(CRYSTALS.map((c) => [c.id, c]));

  const PER_CHAR = 14;
  const PER_WORLD = 180;
  const WEEKS_PER_MONTH = 52 / 12;

  // Mule presets. Each lists every boss the mule clears; the 14 most valuable are sold.
  const PRE_ARCANE = ['hhilla', 'cygnus', 'cpb', 'czak', 'cqueen', 'cpierre', 'cvonbon', 'princess', 'hmag', 'cvel', 'cpap'];
  const NORMALS = ['nlotus', 'ndamien', 'nslime', 'elucid', 'nlucid', 'ewill', 'nwill', 'ngloom', 'ndark', 'nverus'];
  const HLOM = PRE_ARCANE.concat(NORMALS, ['hlotus']);
  const CTENE = HLOM.concat(['hdamien', 'hlucid', 'hwill', 'cslime', 'cgloom', 'hdark', 'hverus']);
  const BM = CTENE.concat(['hbm', 'nseren']);
  const HSEREN = BM.concat(['ekalos', 'hseren']);
  const PRESETS = {
    hlom: { label: 'Hard Lotus mule (Hlom)', bosses: HLOM },
    ctene: { label: 'Chaos Tenebris mule (Ctene)', bosses: CTENE },
    bm: { label: 'Black Mage mule (BM)', bosses: BM },
    hseren: { label: 'Hard Seren mule (Hseren)', bosses: HSEREN },
    custom: { label: 'Custom', bosses: [] },
  };

  const priceOf = (id, overrides, mult) => {
    const c = byId[id];
    if (!c) return 0;
    const p = overrides && overrides[id] != null ? Number(overrides[id]) : c.price;
    return p * (mult || 1);
  };

  /**
   * One character's sold crystals for a week. `withMonthly` decides whether the
   * monthly Black Mage clear lands in this week. Party clears split the price.
   */
  function weekCrystals(bosses, opts, withMonthly) {
    const party = Math.max(1, Number(opts.party) || 1);
    return (bosses || [])
      .map((id) => byId[id])
      .filter((c) => c && (c.freq === 'weekly' || withMonthly))
      .map((c) => ({ id: c.id, name: c.name, freq: c.freq, value: priceOf(c.id, opts.prices, opts.mult) / party }))
      .sort((a, b) => b.value - a.value)
      .slice(0, PER_CHAR);
  }

  /** Average weekly income of one mule (monthly BM spread over 52/12 weeks). */
  function muleWeekly(bosses, opts) {
    const normal = weekCrystals(bosses, opts, false);
    const bmWeek = weekCrystals(bosses, opts, true);
    const sum = (l) => l.reduce((s, c) => s + c.value, 0);
    const hasMonthly = bmWeek.some((c) => c.freq === 'monthly');
    const avg = hasMonthly ? (sum(bmWeek) + (WEEKS_PER_MONTH - 1) * sum(normal)) / WEEKS_PER_MONTH : sum(normal);
    return { normal, bmWeek, avg, hasMonthly, count: normal.length };
  }

  /**
   * Total income for a list of mule groups: [{ name, bosses, count, party }].
   * Applies the 180-crystals-per-world cap by dropping the cheapest crystals.
   */
  function income(groups, opts) {
    opts = opts || {};
    const rows = (groups || []).map((g) => {
      const o = Object.assign({}, opts, { party: g.party });
      const m = muleWeekly(g.bosses, o);
      const n = Math.max(0, Math.floor(Number(g.count) || 0));
      return Object.assign({}, g, m, { n, perMule: m.avg, total: m.avg * n, crystals: m.count * n });
    });
    // world cap: pool every crystal sold in a normal week, keep the 180 most valuable
    const pool = [];
    rows.forEach((r, ri) => { for (let k = 0; k < r.n; k++) r.normal.forEach((c) => pool.push({ ri, value: c.value })); });
    pool.sort((a, b) => b.value - a.value);
    const cut = pool.slice(PER_WORLD);
    const lost = cut.reduce((s, c) => s + c.value, 0);
    cut.forEach((c) => { rows[c.ri].total -= c.value; rows[c.ri].capped = true; });
    const weekly = rows.reduce((s, r) => s + r.total, 0);
    return { rows, weekly, monthly: weekly * WEEKS_PER_MONTH, yearly: weekly * 52, crystals: Math.min(pool.length, PER_WORLD), poolSize: pool.length, lostToCap: lost };
  }

  const API = { CRYSTALS, byId, PRESETS, PER_CHAR, PER_WORLD, WEEKS_PER_MONTH, priceOf, weekCrystals, muleWeekly, income };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.MSIncome = API;
})(typeof window !== 'undefined' ? window : globalThis);
