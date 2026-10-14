// Run with: node scouter/tests/income.test.js
const assert = require('assert');
const INC = require('../js/income.js');
const I = require('../js/items.js');

// Presets build on each other and only use known crystals
const { hlom, ctene, bm, hseren } = INC.PRESETS;
for (const p of [hlom, ctene, bm, hseren]) for (const id of p.bosses) assert.ok(INC.byId[id], 'unknown crystal ' + id);
assert.ok(hlom.bosses.includes('hlotus') && !hlom.bosses.includes('hlucid'));
assert.ok(['cgloom', 'hverus', 'hdark'].every((b) => ctene.bosses.includes(b)));
assert.ok(bm.bosses.includes('hbm') && hseren.bosses.includes('hseren'));

// A mule sells at most 14 crystals, the most valuable ones
const m = INC.muleWeekly(hseren.bosses, {});
assert.strictEqual(m.normal.length, INC.PER_CHAR);
assert.ok(m.normal[0].value >= m.normal[13].value);
assert.ok(m.hasMonthly && m.avg > m.normal.reduce((s, c) => s + c.value, 0), 'BM adds to the average');

// Party splits, price overrides and multipliers apply
const solo = INC.muleWeekly(ctene.bosses, {}).avg;
assert.ok(Math.abs(INC.muleWeekly(ctene.bosses, { party: 2 }).avg - solo / 2) < 1);
assert.ok(Math.abs(INC.muleWeekly(ctene.bosses, { mult: 2 }).avg - solo * 2) < 1);
assert.ok(INC.muleWeekly(['hlotus'], { prices: { hlotus: 1e8 } }).avg === 1e8);

// World cap: 20 Hlom mules × 14 = 280 crystals → only 180 sold
const big = INC.income([{ name: 'x', bosses: hlom.bosses, count: 20, party: 1 }], {});
assert.strictEqual(big.crystals, 180);
assert.ok(big.lostToCap > 0 && big.weekly < INC.muleWeekly(hlom.bosses, {}).avg * 20);
const small = INC.income([{ name: 'x', bosses: hlom.bosses, count: 3, party: 1 }], {});
assert.strictEqual(small.lostToCap, 0);

// Item catalog: every item maps to a slot, and slot labels resolve
for (const it of Object.values(I.ITEMS)) assert.ok(I.SLOTS[it.slot], it.key);
assert.strictEqual(I.slotTypeOf('Pendant 2'), 'pendant');
assert.strictEqual(I.slotTypeOf('Face Accessory'), 'face');

console.log('all income tests passed', { hlom: Math.round(INC.muleWeekly(hlom.bosses, {}).avg / 1e6) + 'M', ctene: Math.round(solo / 1e6) + 'M',
  bm: Math.round(INC.muleWeekly(bm.bosses, {}).avg / 1e6) + 'M', hseren: Math.round(m.avg / 1e6) + 'M' });
