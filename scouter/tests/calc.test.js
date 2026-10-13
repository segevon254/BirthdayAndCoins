// Run with: node scouter/tests/calc.test.js
const assert = require('assert');
const C = require('../js/calc.js');
const D = require('../js/data.js');

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
const s = C.defaultState();
const boss = C.bossById(s, 'hseren');

// IED stacks multiplicatively and removal inverts addition
near(C.combineIed(0.5, [0.5]), 0.75, 1e-12, 'ied stack');
near(C.combineIed(C.combineIed(0.9, [0.3]), [-0.3]), 0.9, 1e-12, 'ied remove');

// Force multipliers
assert.strictEqual(C.sacredMult(250, 200), 1.25);
assert.strictEqual(C.sacredMult(200, 200), 1);
near(C.sacredMult(180, 200), 0.8, 1e-12, 'sac -20');
assert.strictEqual(C.arcaneMult(1320, 1320), 1);
assert.strictEqual(C.arcaneMult(1320, 760), 1.5);

// Familiar boss cap
const fd = C.familiarDelta(D.FAMILIAR_PRESETS.bossied.fams);
near(fd.boss, 1.2, 1e-12, 'familiar boss cap');

// Efficiency: every positive stat gives positive gain; crit rate at 100% gives none
const eff = C.efficiencyTable(s, boss);
for (const r of eff) {
  if (r.label === '1% Critical Rate') assert.strictEqual(r.gain, 0);
  else if (!/Sacred|Arcane|level/.test(r.label)) assert.ok(r.gain > 0, r.label);
}
// main-stat equivalent of 100 unaffected main is 100
near(eff.find((r) => r.label.startsWith('100 Main stat (unaffected)')).mainEq, 100, 1e-6, 'mainEq identity');

// Star Force: exact solver agrees with Monte-Carlo
for (const opts of [{ starCatch: true }, { starCatch: true, keepOnBoom: true }]) {
  const e = C.sfExpected(200, 17, 22, opts, 0);
  const m = C.sfSimulate(200, 17, 22, opts, 0, 6000);
  near(m.mean / e.cost, 1, 0.08, 'sf mc vs exact ' + JSON.stringify(opts));
}
near(C.sfBaseCost(200, 15), 71.3e6, 1e5, 'sf base cost lv200 15★');

// Potential odds are probabilities and decrease with target
const p30 = C.potProbability(200, 'stat', 'black', 30), p33 = C.potProbability(200, 'stat', 'black', 33);
assert.ok(p30 > p33 && p33 > 0 && p30 < 1);

// Optimizers never make things worse
assert.ok(C.hyperOptimize(s, boss).gain >= -1e-9);
assert.ok(C.legionOptimize(s, boss).gain >= -1e-9);

// Calibration: after calibrating to a time, the estimate matches it
const cal = Object.assign(C.clone(s), { calib: C.calibrate(s, 'hseren', 20) });
near(C.bossEstimate(cal, boss).clearSec, 1200, 1e-6, 'calibration');

// bakeDelta keeps the gain consistent
const d = { boss: 0.1, ied: [0.1], attFlat: 50, mainFlat: 300 };
const baked = C.bakeDelta(s, d);
near(C.dps(baked, boss) / C.dps(s, boss, d), 1, 1e-9, 'bake consistent');

// Share links round-trip
assert.strictEqual(C.decodeState(C.encodeState(s)).mainStat, s.mainStat);

// Budget plan stays within budget
const plan = C.budgetPlan(s, C.bossById(s, s.targetBoss), 20e9, 10);
assert.ok(plan.spent <= 20e9 && plan.gain > 0);

console.log('all calc tests passed');
