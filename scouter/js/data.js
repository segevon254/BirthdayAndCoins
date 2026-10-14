/*
 * GMS Scouter — game data tables.
 *
 * Values marked `approx: true` (or noted in comments) come from community sources
 * (MapleStory Wiki, MapleHub / maplerhouse boss tables, Nexon Maple Memos) or are
 * best estimates. Every table here can be overridden from the "Data" tab, so if a
 * patch changes something you can fix it without touching code.
 */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Classes (GMS). `weapon` multiplier is only used for the displayed damage range.
  // ---------------------------------------------------------------------------
  const CLASSES = [
    ['hero', 'Hero', 'STR', 'DEX', 1.34], ['paladin', 'Paladin', 'STR', 'DEX', 1.34],
    ['darkknight', 'Dark Knight', 'STR', 'DEX', 1.49], ['fp', 'Arch Mage (F/P)', 'INT', 'LUK', 1.2],
    ['il', 'Arch Mage (I/L)', 'INT', 'LUK', 1.2], ['bishop', 'Bishop', 'INT', 'LUK', 1.2],
    ['bowmaster', 'Bowmaster', 'DEX', 'STR', 1.3], ['marksman', 'Marksman', 'DEX', 'STR', 1.35],
    ['pathfinder', 'Pathfinder', 'DEX', 'STR', 1.3], ['nightlord', 'Night Lord', 'LUK', 'DEX', 1.75],
    ['shadower', 'Shadower', 'LUK', 'DEX', 1.3], ['dualblade', 'Dual Blade', 'LUK', 'DEX', 1.3],
    ['buccaneer', 'Buccaneer', 'STR', 'DEX', 1.7], ['corsair', 'Corsair', 'DEX', 'STR', 1.5],
    ['cannoneer', 'Cannoneer', 'STR', 'DEX', 1.5], ['dawnwarrior', 'Dawn Warrior', 'STR', 'DEX', 1.34],
    ['blazewizard', 'Blaze Wizard', 'INT', 'LUK', 1.2], ['windarcher', 'Wind Archer', 'DEX', 'STR', 1.3],
    ['nightwalker', 'Night Walker', 'LUK', 'DEX', 1.75], ['thunderbreaker', 'Thunder Breaker', 'STR', 'DEX', 1.7],
    ['mihile', 'Mihile', 'STR', 'DEX', 1.2], ['aran', 'Aran', 'STR', 'DEX', 1.49],
    ['evan', 'Evan', 'INT', 'LUK', 1.2], ['mercedes', 'Mercedes', 'DEX', 'STR', 1.3],
    ['phantom', 'Phantom', 'LUK', 'DEX', 1.3], ['luminous', 'Luminous', 'INT', 'LUK', 1.2],
    ['shade', 'Shade', 'STR', 'DEX', 1.7], ['blaster', 'Blaster', 'STR', 'DEX', 1.7],
    ['battlemage', 'Battle Mage', 'INT', 'LUK', 1.2], ['wildhunter', 'Wild Hunter', 'DEX', 'STR', 1.35],
    ['mechanic', 'Mechanic', 'DEX', 'STR', 1.5], ['xenon', 'Xenon (enter STR+DEX+LUK / 2)', 'ALL', '-', 1.3125],
    ['demonslayer', 'Demon Slayer', 'STR', 'DEX', 1.2], ['demonavenger', 'Demon Avenger (enter HP/14)', 'HP', 'STR', 1.3],
    ['kaiser', 'Kaiser', 'STR', 'DEX', 1.34], ['angelicbuster', 'Angelic Buster', 'DEX', 'STR', 1.7],
    ['cadena', 'Cadena', 'LUK', 'DEX', 1.3], ['kain', 'Kain', 'DEX', 'STR', 1.3],
    ['illium', 'Illium', 'INT', 'LUK', 1.2], ['ark', 'Ark', 'STR', 'DEX', 1.7],
    ['adele', 'Adele', 'STR', 'DEX', 1.3], ['khali', 'Khali', 'LUK', 'DEX', 1.3],
    ['hoyoung', 'Hoyoung', 'LUK', 'DEX', 1.35], ['lara', 'Lara', 'INT', 'LUK', 1.2],
    ['lynn', 'Lynn', 'INT', 'LUK', 1.2], ['moxuan', 'Mo Xuan', 'STR', 'DEX', 1.7],
    ['sia', 'Sia Astelle', 'INT', 'LUK', 1.2], ['kanna', 'Kanna', 'INT', 'LUK', 1.35],
    ['hayato', 'Hayato', 'STR', 'DEX', 1.25], ['zero', 'Zero', 'STR', 'DEX', 1.34],
    ['kinesis', 'Kinesis', 'INT', 'LUK', 1.2], ['beasttamer', 'Beast Tamer', 'INT', 'LUK', 1.34],
  ].map(([id, name, main, sub, weapon]) => ({ id, name, main, sub, weapon }));

  // ---------------------------------------------------------------------------
  // Bosses (GMS). hp = total HP across all phases. force: 'arc' | 'sac' | null.
  // time = time limit (minutes). party = max party size.
  // Sources: MapleHub / maplerhouse boss HP tables (2026), MapleStory Wiki boss pages.
  // ---------------------------------------------------------------------------
  const T = 1e12, Q = 1e15, B = 1e9;
  const BOSSES = [
    // id, name, level, pdr, force, req, hp, time, party, approx
    ['hmag', 'Hard Magnus', 190, 1.2, null, 0, 120 * B, 30, 6, false],
    ['cvel', 'Chaos Vellum', 190, 2.0, null, 0, 200 * B, 30, 6, false],
    ['cpap', 'Chaos Papulatus', 190, 2.5, null, 0, 504 * B, 30, 6, false],
    ['nlotus', 'Normal Lotus', 210, 3.0, 'arc', 100, 1.57 * T, 30, 6, false],
    ['ndamien', 'Normal Damien', 210, 3.0, 'arc', 100, 1.2 * T, 30, 6, false],
    ['nslime', 'Normal Guardian Angel Slime', 220, 3.0, 'arc', 500, 5 * T, 30, 6, false],
    ['elucid', 'Easy Lucid', 230, 3.0, 'arc', 360, 12 * T, 30, 6, false],
    ['nlucid', 'Normal Lucid', 230, 3.0, 'arc', 360, 24 * T, 30, 6, false],
    ['ewill', 'Easy Will', 235, 3.0, 'arc', 560, 16.8 * T, 30, 6, false],
    ['nwill', 'Normal Will', 235, 3.0, 'arc', 760, 25.2 * T, 30, 6, false],
    ['hlotus', 'Hard Lotus', 210, 3.0, 'arc', 100, 33.5 * T, 30, 6, false],
    ['hdamien', 'Hard Damien', 210, 3.0, 'arc', 100, 36 * T, 30, 6, false],
    ['ngloom', 'Normal Gloom', 255, 3.0, 'arc', 730, 25.5 * T, 30, 6, false],
    ['ndark', 'Normal Darknell', 265, 3.0, 'arc', 850, 26 * T, 30, 6, false],
    ['nverus', 'Normal Verus Hilla', 250, 3.0, 'arc', 820, 88 * T, 30, 6, false],
    ['hlucid', 'Hard Lucid', 230, 3.0, 'arc', 360, 117.6 * T, 30, 6, false],
    ['hwill', 'Hard Will', 250, 3.0, 'arc', 760, 126 * T, 30, 6, false],
    ['cslime', 'Chaos Guardian Angel Slime', 250, 3.0, 'arc', 800, 90 * T, 30, 6, false],
    ['cgloom', 'Chaos Gloom', 255, 3.0, 'arc', 730, 127.5 * T, 30, 6, false],
    ['hdark', 'Hard Darknell', 265, 3.0, 'arc', 850, 157.5 * T, 30, 6, false],
    ['hverus', 'Hard Verus Hilla', 250, 3.0, 'arc', 900, 176 * T, 30, 6, false],
    ['nseren', 'Normal Chosen Seren', 265, 3.8, 'sac', 200, 208 * T, 30, 6, false],
    ['hbm', 'Hard Black Mage', 275, 3.0, 'arc', 1320, 472.5 * T, 60, 6, false],
    ['ekalos', 'Easy Kalos the Guardian', 270, 3.3, 'sac', 200, 357 * T, 30, 6, false],
    ['hseren', 'Hard Chosen Seren', 275, 3.8, 'sac', 200, 483 * T, 30, 6, false],
    ['ekaling', 'Easy Kaling', 275, 3.8, 'sac', 230, 921 * T, 30, 6, false],
    ['nkalos', 'Normal Kalos the Guardian', 280, 3.8, 'sac', 300, 1.06 * Q, 30, 6, false],
    ['nmalefic', 'Normal Radiant Malefic Star', 280, 3.8, 'sac', 400, 3.26 * Q, 30, 3, false],
    ['nkaling', 'Normal Kaling', 285, 3.8, 'sac', 330, 3.93 * Q, 30, 6, false],
    ['ckalos', 'Chaos Kalos the Guardian', 285, 3.8, 'sac', 330, 5.12 * Q, 30, 6, false],
    ['nlimbo', 'Normal Limbo', 285, 3.8, 'sac', 500, 6.48 * Q, 30, 3, false],
    ['eseren', 'Extreme Chosen Seren', 280, 3.8, 'sac', 200, 7.27 * Q, 30, 6, true],
    ['nbaldrix', 'Normal Baldrix', 290, 3.8, 'sac', 700, 9.06 * Q, 30, 3, false],
    ['hkaling', 'Hard Kaling', 285, 3.8, 'sac', 350, 11.84 * Q, 30, 6, false],
    ['hlimbo', 'Hard Limbo', 285, 3.8, 'sac', 500, 12.55 * Q, 30, 3, false],
    ['hmalefic', 'Hard Radiant Malefic Star', 285, 3.8, 'sac', 550, 14.7 * Q, 30, 3, false],
    ['hbaldrix', 'Hard Baldrix', 290, 3.8, 'sac', 700, 20.34 * Q, 30, 3, false],
    ['xkalos', 'Extreme Kalos the Guardian', 285, 3.8, 'sac', 440, 21.57 * Q, 30, 6, false],
    ['xkaling', 'Extreme Kaling', 285, 3.8, 'sac', 480, 54.59 * Q, 30, 6, false],
  ].map(([id, name, level, pdr, force, req, hp, time, party, approx]) =>
    ({ id, name, level, pdr, force, req, hp, time, party, approx }));

  // ---------------------------------------------------------------------------
  // Familiars (GMS, post v.264). Line values per tier. Nexon has not published
  // line weights since v.264; Boss values follow the Maple Memo (Unique = 40% only),
  // IED follows community guides. Non-boss lines are estimates — edit if needed.
  // Familiar Boss Damage is capped at 120% total (MapleStory Wiki).
  // ---------------------------------------------------------------------------
  const FAMILIAR_TIERS = ['Rare', 'Epic', 'Unique', 'Legendary'];
  const FAMILIAR_LINES = {
    none: { label: '(empty / non-combat line)', values: { Rare: [0], Epic: [0], Unique: [0], Legendary: [0] } },
    boss: { label: 'Boss Damage %', values: { Rare: [15, 20], Epic: [25, 30], Unique: [40], Legendary: [45, 50] } },
    ied: { label: 'Ignore Enemy DEF %', values: { Rare: [10, 15], Epic: [20, 30], Unique: [30, 35, 40], Legendary: [45, 50] } },
    dmg: { label: 'Damage %', values: { Rare: [5, 10], Epic: [15], Unique: [20, 25], Legendary: [30, 35] }, approx: true },
    att: { label: 'ATT / MATT (flat)', values: { Rare: [10], Epic: [15, 20], Unique: [25, 30], Legendary: [35, 40] }, approx: true },
    cr: { label: 'Critical Rate %', values: { Rare: [5], Epic: [10], Unique: [15], Legendary: [20] }, approx: true },
    mainPct: { label: 'Main stat %', values: { Rare: [3], Epic: [6], Unique: [9], Legendary: [12] }, approx: true },
  };
  const FAMILIAR_BOSS_CAP = 1.2;
  // Community-estimated odds per reroll of a Legendary familiar (GMS Upgrade Tracker).
  // line1 = chance the first line rolls it; line2 = chance the second line does.
  const FAMILIAR_ODDS = {
    'boss:50': { line1: 1 / 130, line2: 1 / 13000 },
    'boss:45': { line1: 1 / 180, line2: 1 / 18000 },
    'ied:50': { line1: 1 / 190, line2: 1 / 20000 },
    'ied:45': { line1: 1 / 130, line2: 1 / 13000 },
  };
  // Realistic GMS setups: almost every familiar has one useful line (a 2nd matching line is ~1 in 13,000+).
  const FAMILIAR_PRESETS = {
    cap45: { label: '3× Legendary Boss 45% (cap)', fams: [{ tier: 'Legendary', lines: [{ type: 'boss', val: 45 }, { type: 'none', val: 0 }] }, { tier: 'Legendary', lines: [{ type: 'boss', val: 45 }, { type: 'none', val: 0 }] }, { tier: 'Legendary', lines: [{ type: 'boss', val: 45 }, { type: 'none', val: 0 }] }] },
    unique40: { label: '3× Unique Boss 40% (cap)', fams: [{ tier: 'Unique', lines: [{ type: 'boss', val: 40 }, { type: 'none', val: 0 }] }, { tier: 'Unique', lines: [{ type: 'boss', val: 40 }, { type: 'none', val: 0 }] }, { tier: 'Unique', lines: [{ type: 'boss', val: 40 }, { type: 'none', val: 0 }] }] },
    bossied: { label: '2× Legendary Boss 50% + IED 50%', fams: [{ tier: 'Legendary', lines: [{ type: 'boss', val: 50 }, { type: 'none', val: 0 }] }, { tier: 'Legendary', lines: [{ type: 'boss', val: 50 }, { type: 'none', val: 0 }] }, { tier: 'Legendary', lines: [{ type: 'ied', val: 50 }, { type: 'none', val: 0 }] }] },
    ied3: { label: '3× Legendary IED 50%', fams: [{ tier: 'Legendary', lines: [{ type: 'ied', val: 50 }, { type: 'none', val: 0 }] }, { tier: 'Legendary', lines: [{ type: 'ied', val: 50 }, { type: 'none', val: 0 }] }, { tier: 'Legendary', lines: [{ type: 'ied', val: 50 }, { type: 'none', val: 0 }] }] },
    dream: { label: '3× two-line Boss 50 / IED 50 (whale)', fams: [0, 1, 2].map(() => ({ tier: 'Legendary', lines: [{ type: 'boss', val: 50 }, { type: 'ied', val: 50 }] })) },
    empty: { label: 'No familiars', fams: [0, 1, 2].map(() => ({ tier: 'Rare', lines: [{ type: 'none', val: 0 }, { type: 'none', val: 0 }] })) },
  };

  // ---------------------------------------------------------------------------
  // Doping / bossing buffs (GMS). Values editable on the Character tab.
  // ---------------------------------------------------------------------------
  const DOPING = [
    { id: 'echo', name: 'Echo of Hero', stat: 'attPct', val: 4 },
    { id: 'xpot', name: 'Extreme Potion (Red/Blue/Green/Gold)', stat: 'attFlat', val: 30 },
    { id: 'guildboss', name: 'Guild skill: Boss Slayers', stat: 'boss', val: 30, approx: true },
    { id: 'guildied', name: 'Guild skill: Undeterred', stat: 'ied', val: 30, approx: true },
    { id: 'guilddmg', name: 'Guild skill: For the Guild', stat: 'dmg', val: 30, approx: true },
    { id: 'mvp', name: 'MVP Superpower buff', stat: 'attFlat', val: 30, approx: true },
    { id: 'custom', name: 'Custom (Boss %)', stat: 'boss', val: 0 },
  ];

  // ---------------------------------------------------------------------------
  // Hyper stats. cost[i] = points to go from level i to i+1.
  // ---------------------------------------------------------------------------
  const HYPER_COST = [1, 2, 4, 8, 10, 15, 20, 25, 30, 35, 50, 65, 80, 95, 110];
  const HYPER_STATS = {
    main: { label: 'Main stat (+30 flat / lvl)', per: (l) => 30 * l },
    cr: { label: 'Critical Rate', per: (l) => (l <= 5 ? l : 5 + 2 * (l - 5)) / 100 },
    cd: { label: 'Critical Damage (+1% / lvl)', per: (l) => l / 100 },
    ied: { label: 'Ignore DEF (+3% / lvl)', per: (l) => 3 * l / 100 },
    dmg: { label: 'Damage (+3% / lvl)', per: (l) => 3 * l / 100 },
    boss: { label: 'Boss Damage (3% to lv5, then 4%)', per: (l) => (l <= 5 ? 3 * l : 15 + 4 * (l - 5)) / 100 },
    att: { label: 'ATT / MATT (+3 / lvl)', per: (l) => 3 * l },
  };
  function hyperPointsAtLevel(level) {
    let pts = 0;
    for (let L = 140; L <= level; L++) pts += 3 + Math.floor((L - 140) / 10);
    return pts;
  }

  // ---------------------------------------------------------------------------
  // Legion board (offensive regions only). Geometry is ignored — the optimizer
  // only reallocates cells within each region's cap.
  // ---------------------------------------------------------------------------
  const LEGION_REGIONS = {
    boss: { label: 'Boss Damage (1% / cell)', per: 0.01, max: 40 },
    ied: { label: 'Ignore DEF (1% / cell)', per: 0.01, max: 40 },
    cd: { label: 'Critical Damage (0.5% / cell)', per: 0.005, max: 40 },
    cr: { label: 'Critical Rate (1% / cell)', per: 0.01, max: 40 },
    main: { label: 'Main stat (5 / cell, inner)', per: 5, max: 15 },
    att: { label: 'ATT (1 / cell, inner)', per: 1, max: 15 },
  };

  // ---------------------------------------------------------------------------
  // Star Force — GMS post-v.264 system (no star drops on failure, 30★ cap) with
  // the v.269 Enhancement Modes. Sources: MapleStory Wiki / DigitalTQ rate table,
  // NamuWiki cost divisors (match KMS calculators), v.269 patch notes.
  // success[s] = chance s→s+1; boomOfFail[s] = fraction of failures that destroy.
  // ---------------------------------------------------------------------------
  const SF = {
    success: [0.95, 0.90, 0.85, 0.85, 0.80, 0.75, 0.70, 0.65, 0.60, 0.55, 0.50, 0.45, 0.40, 0.35, 0.30,
      0.30, 0.30, 0.15, 0.15, 0.15, 0.30, 0.15, 0.15, 0.10, 0.10, 0.10, 0.07, 0.05, 0.03, 0.01],
    boomOfFail: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0.03, 0.03, 0.08, 0.08, 0.10, 0.15, 0.15, 0.20, 0.20, 0.20, 0.20, 0.20, 0.20, 0.20, 0.20],
    // cost = 1000 + L³(s+1)^2.7 / div[s] for s ≥ 10 (L rounded down to 10s)
    costDiv: { 10: 400, 11: 220, 12: 150, 13: 110, 14: 75, 17: 150, 18: 70, 19: 45, 21: 125 },
    costDivDefault: 200,
    // GMS trace restore: where a destroyed item comes back.
    boomDest: (s) => (s <= 20 ? 12 : s <= 22 ? 17 : s <= 25 ? 19 : 20),
    restoreStar: 12,
    safeguardStars: [15, 16, 17],          // safeguard: +200% of base cost (no discounts), 0% boom
    modeStars: [15, 16, 17, 18, 19, 20, 21], // Enhancement Modes apply to 15★–21★ attempts
    // v.269 Enhancement Modes (community data: NamuWiki GMS section, tadeucci v269 calculator).
    // Cost multiplier vs Mode 1: 15–17★ 1 / 1.5 / 2.5 (Safeguard = 3×), 18–21★ 1 / 2 / 3.5 / 6.5.
    modeCost: { low: { 1: 1, 2: 1.5, 3: 2.5 }, high: { 1: 1, 2: 2, 3: 3.5, 4: 6.5 } },
    // Share of failures that boom, per mode (reproduces the published rates exactly with star catching).
    modeBoomOfFail: {
      1: { 15: 0.03, 16: 0.03, 17: 0.08, 18: 0.08, 19: 0.10, 20: 0.15, 21: 0.15 },
      2: { 15: 0.02, 16: 0.02, 17: 0.05, 18: 0.05, 19: 0.07, 20: 0.10, 21: 0.10 },
      3: { 15: 0.01, 16: 0.01, 17: 0.02, 18: 0.02, 19: 0.04, 20: 0.05, 21: 0.05 },
      4: { 15: 0, 16: 0, 17: 0, 18: 0, 19: 0, 20: 0, 21: 0 },
    },
    // From 18★ higher modes also lower success (base rates before star catching). 18/19/21★: 15% → 12 / 10 / 8%;
    // 20★: 30% → 25 / 20%, both back-solved from the published boom rates; Mode 4 at 20★ assumed ~half (16%).
    modeSuccess: {
      2: { 18: 0.12, 19: 0.12, 20: 0.25, 21: 0.12 },
      3: { 18: 0.10, 19: 0.10, 20: 0.20, 21: 0.10 },
      4: { 18: 0.08, 19: 0.08, 20: 0.16, 21: 0.08 },
    },
    // armor ATT gained at star s+1 for item level 200 (index = target star). Other brackets shift.
    armorAtt200: { 16: 12, 17: 13, 18: 14, 19: 15, 20: 16, 21: 17, 22: 19, 23: 21, 24: 23, 25: 25, 26: 27, 27: 29, 28: 31, 29: 33, 30: 35 },
    weaponAtt200: { 16: 13, 17: 13, 18: 14, 19: 14, 20: 15, 21: 16, 22: 17, 23: 34, 24: 35, 25: 36, 26: 37, 27: 38, 28: 39, 29: 40, 30: 41 },
    approxAbove25: true,
  };
  // Strategy options per star: '1' standard, 'sg' safeguard (15–17), '2'/'3' modes, '4' no-boom mode (18–21).
  const SF_OPTIONS = { 1: 'Mode 1 (standard)', sg: 'Safeguard', 2: 'Mode 2', 3: 'Mode 3', 4: 'Mode 4 (no boom)' };
  function sfOptionsFor(s) {
    if (s < 15 || s > 21) return ['1'];
    return s <= 17 ? ['1', 'sg', '2', '3'] : ['1', '2', '3', '4'];
  }

  // ---------------------------------------------------------------------------
  // Potential (Legendary). Line odds are approximations of GMS cube tables.
  // ---------------------------------------------------------------------------
  const CUBES = {
    red: { label: 'Red Cube', prime: [1, 0.10, 0.01], cost: 12e6 },
    black: { label: 'Black Cube', prime: [1, 0.20, 0.05], cost: 22e6 },
    bright: { label: 'Bright Cube', prime: [1, 0.20, 0.05], cost: 30e6 },
    glowing: { label: 'Glowing Cube', prime: [1, 0.10, 0.01], cost: 15e6 },
  };
  const POT_LINES = {
    // probability an individual line rolls the stat, and its value, for prime / non-prime lines
    // main-stat %: 9.7561% prime / 7.2581% non-prime (KMS official armor tables); all-stat% estimated.
    stat: { prime: { main: 0.097561, all: 0.073171 }, nonprime: { main: 0.072581, all: 0.056452 } },
    // weapon / secondary / emblem ATT% (estimate in line with the armor main-stat weights)
    att: { prime: { main: 0.097561, all: 0 }, nonprime: { main: 0.072581, all: 0 } },
  };
  function potValues(level) {
    // [prime main, prime all, nonprime main, nonprime all]
    if (level >= 151) return [13, 10, 10, 7]; // GMS: level 151+ items roll the 13% tier
    return [12, 9, 9, 6];
  }

  // ---------------------------------------------------------------------------
  // HEXA Matrix fragment / Sol Erda costs per level (index = target level).
  // ---------------------------------------------------------------------------
  const HEXA_COSTS = {
    origin: { erda: [0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 10, 3, 3, 4, 4, 4, 4, 4, 4, 5, 15, 5, 5, 5, 5, 5, 6, 6, 6, 7, 20],
      frag: [0, 0, 30, 35, 40, 45, 50, 55, 60, 65, 200, 80, 90, 100, 110, 120, 130, 140, 150, 160, 350, 170, 180, 190, 200, 210, 220, 230, 240, 250, 500] },
    mastery: { erda: [0, 3, 1, 1, 1, 1, 1, 1, 1, 2, 5, 2, 2, 2, 2, 2, 2, 2, 2, 3, 8, 3, 3, 3, 3, 3, 3, 3, 4, 4, 10],
      frag: [0, 50, 15, 18, 20, 23, 25, 28, 30, 33, 100, 40, 45, 50, 55, 60, 65, 70, 75, 80, 175, 85, 90, 95, 100, 105, 110, 115, 120, 125, 250] },
    enhance: { erda: [0, 4, 1, 1, 1, 2, 2, 2, 3, 3, 8, 3, 3, 3, 3, 3, 3, 3, 3, 4, 12, 4, 4, 4, 4, 4, 5, 5, 5, 6, 15],
      frag: [0, 75, 23, 27, 30, 34, 38, 42, 45, 49, 150, 60, 68, 75, 83, 90, 98, 105, 113, 120, 263, 128, 135, 143, 150, 158, 165, 173, 180, 188, 375] },
    common: { erda: [0, 7, 2, 2, 2, 3, 3, 3, 5, 5, 14, 5, 5, 5, 5, 5, 5, 5, 5, 7, 20, 7, 7, 7, 7, 7, 8, 8, 8, 11, 25],
      frag: [0, 125, 38, 44, 50, 57, 63, 69, 75, 82, 300, 110, 124, 138, 152, 165, 179, 193, 207, 220, 525, 234, 248, 262, 275, 289, 303, 317, 330, 344, 750] },
  };
  // Relative damage multiplier of a core's skills at level L (L=0 means inactive / plain 5th job).
  const HEXA_CURVES = {
    origin: (L) => L <= 0 ? 0 : (1 + 0.035 * (L - 1)) * (L >= 10 ? 1.1 : 1) * (L >= 20 ? 1.1 : 1) * (L >= 30 ? 1.2 : 1),
    mastery: (L) => L <= 0 ? 1 : (1.15 + 0.03 * (L - 1)) * (L >= 30 ? 1.05 : 1),
    enhance: (L) => (1 + 0.02 * L) * (L >= 10 ? 1.05 : 1) * (L >= 20 ? 1.05 : 1) * (L >= 30 ? 1.05 : 1),
    common: (L) => L <= 0 ? 0 : 1 + 0.03 * (L - 1),
  };
  const DEFAULT_HEXA = [
    { name: 'Origin skill', kind: 'origin', level: 1, share: 15 },
    { name: 'Mastery core 1', kind: 'mastery', level: 1, share: 25 },
    { name: 'Mastery core 2', kind: 'mastery', level: 0, share: 10 },
    { name: 'Mastery core 3', kind: 'mastery', level: 0, share: 5 },
    { name: 'Mastery core 4', kind: 'mastery', level: 0, share: 5 },
    { name: 'Enhancement core 1', kind: 'enhance', level: 0, share: 8 },
    { name: 'Enhancement core 2', kind: 'enhance', level: 0, share: 6 },
    { name: 'Enhancement core 3', kind: 'enhance', level: 0, share: 5 },
    { name: 'Enhancement core 4', kind: 'enhance', level: 0, share: 4 },
    { name: 'Sol Janus (common)', kind: 'common', level: 0, share: 3 },
  ];

  // ---------------------------------------------------------------------------
  // Seed rings. effect per level is ATT% (as a fraction). uptime = fraction of a
  // cycle the ring is active; burstAligned rings get extra weight from burst windows.
  // ---------------------------------------------------------------------------
  const SEED_RINGS = {
    none: { label: 'None', duration: [0, 0, 0, 0], cycle: 1 },
    // Ring of Restraint: ATT +25/50/75/100% for 9s, 180s cooldown — used inside burst.
    restraint: { label: 'Ring of Restraint', attPct: [0.25, 0.5, 0.75, 1.0], duration: [9, 9, 9, 9], cycle: 180, burstAligned: true },
    // Continuous Ring (v227 / KMST 1.2.155): Boss +35/70/105/140%, ATT +4/6/8/10% for 5/6/7/8s, then a 12s re-activation cooldown.
    continuous: { label: 'Continuous Ring', attPct: [0.04, 0.06, 0.08, 0.10], boss: [0.35, 0.70, 1.05, 1.40], duration: [5, 6, 7, 8], cooldownAfter: 12 },
    // Weapon Jump: main stat +80/160/240/320% of main-weapon ATT for 15s, 120s cooldown (stat is not %-affected).
    weaponjump: { label: 'Weapon Jump Ring', statOfWeapon: [0.8, 1.6, 2.4, 3.2], duration: [15, 15, 15, 15], cycle: 120, burstAligned: true, approx: true },
    // Risk Taker values are not documented in community sources — rough estimate.
    risktaker: { label: 'Risk Taker Ring', attPct: [0.2, 0.3, 0.4, 0.5], duration: [12, 12, 12, 12], cycle: 180, burstAligned: true, approx: true },
  };

  // ---------------------------------------------------------------------------
  // Gear slots and a default "typical endgame" gear sheet.
  // kind: 'armor' | 'weapon' | 'acc'. pot = main potential total (stat% or ATT%).
  // ---------------------------------------------------------------------------
  const GEAR_DEFAULT = [
    // slot label, kind, level, stars, pot type, pot %, slot type, catalog item
    ['Weapon', 'weapon', 200, 22, 'att', 21, 'weapon', 'w_arcane'],
    ['Secondary', 'acc', 160, 0, 'att', 21, 'secondary', null],
    ['Emblem', 'acc', 100, 0, 'att', 21, 'emblem', 'e_gml'],
    ['Hat', 'armor', 200, 22, 'stat', 27, 'hat', 'h_arcane'],
    ['Top', 'armor', 150, 22, 'stat', 27, 'top', 't_cra'],
    ['Bottom', 'armor', 150, 22, 'stat', 27, 'bottom', 'b_cra'],
    ['Shoes', 'armor', 200, 22, 'stat', 27, 'shoes', 's_arcane'],
    ['Gloves', 'armor', 200, 22, 'stat', 21, 'gloves', 'g_arcane'],
    ['Cape', 'armor', 200, 22, 'stat', 27, 'cape', 'c_arcane'],
    ['Shoulder', 'armor', 200, 22, 'stat', 27, 'shoulder', 'sh_arcane'],
    ['Belt', 'armor', 200, 22, 'stat', 27, 'belt', 'bt_dreamy'],
    ['Face Accessory', 'armor', 160, 22, 'stat', 27, 'face', 'f_berserked'],
    ['Eye Accessory', 'armor', 160, 22, 'stat', 27, 'eye', 'y_eyepatch'],
    ['Earrings', 'armor', 150, 22, 'stat', 27, 'earring', 'er_gollux'],
    ['Pendant 1', 'armor', 150, 22, 'stat', 27, 'pendant', 'p_gollux'],
    ['Pendant 2', 'armor', 160, 22, 'stat', 27, 'pendant', 'p_sos'],
    ['Ring 1', 'armor', 150, 22, 'stat', 27, 'ring', 'r_gollux'],
    ['Ring 2', 'armor', 160, 22, 'stat', 27, 'ring', 'r_gar'],
    ['Ring 3', 'armor', 200, 22, 'stat', 27, 'ring', 'r_terror'],
    ['Heart', 'armor', 200, 22, 'stat', 27, 'heart', 'ht_total'],
].map(([slot, kind, level, stars, potType, pot, slotType, item]) => ({ slot, kind, level, stars, potType, pot, replace: 0, slotType, item, iconId: null }));

  // Calibration: reference DPS per point of HEXA-adjusted Scouter score.
  // Chosen so a ~170k-score character with mid HEXA progress solos Hard Seren in ~22 min.
  const DPS_PER_SCORE = 1.8e6;

  const DATA = {
    CLASSES, BOSSES, FAMILIAR_TIERS, FAMILIAR_LINES, FAMILIAR_BOSS_CAP, FAMILIAR_ODDS, FAMILIAR_PRESETS, DOPING,
    HYPER_COST, HYPER_STATS, hyperPointsAtLevel, LEGION_REGIONS, SF, SF_OPTIONS, sfOptionsFor, CUBES, POT_LINES, potValues,
    HEXA_COSTS, HEXA_CURVES, DEFAULT_HEXA, SEED_RINGS, GEAR_DEFAULT, DPS_PER_SCORE,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
  else root.MSData = DATA;
})(typeof window !== 'undefined' ? window : globalThis);
