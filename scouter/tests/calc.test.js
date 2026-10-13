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
const fd = C.familiarDelta(D.FAMILIAR_PRESETS.dream.fams);
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
// New-system cost divisors: lv250 15★ ≈ 139M, 20★ ≈ 290M, 21★ ≈ 527M (KMS calculator values)
near(C.sfBaseCost(250, 15) / 1e6, 139.3, 0.5, 'lv250 15★');
near(C.sfBaseCost(250, 20) / 1e6, 290.2, 0.5, 'lv250 20★');
near(C.sfBaseCost(250, 21) / 1e6, 526.8, 0.5, 'lv250 21★');
// Rates with star catching match the published table (2.05% / 6.74% / 12.64% boom)
near(C.sfAttempt(200, 15, { starCatch: true }).b, 0.0206, 0.0002, '15★ boom');
near(C.sfAttempt(200, 17, { starCatch: true }).b, 0.0674, 0.0002, '17★ boom');
near(C.sfAttempt(200, 21, { starCatch: true }).b, 0.1264, 0.0002, '21★ boom');
near(C.sfAttempt(200, 22, {}).b, 0.17, 1e-9, '22★ boom');
// Safeguard: +200% of base, not discounted, 0% boom; only 15–17★; Mode 4 maps to safeguard on 15–17★
const sg = C.sfAttempt(200, 16, { sfEvent30: true, plan: { 16: 'sg' } });
near(sg.cost, C.sfBaseCost(200, 16) * (0.7 + 2), 1, 'safeguard cost');
assert.strictEqual(sg.b, 0);
assert.strictEqual(C.sfAttempt(200, 18, { plan: { 18: 'sg' } }).choice, '1');
assert.strictEqual(C.sfAttempt(200, 16, { plan: { 16: '4' } }).choice, 'sg');
assert.strictEqual(C.sfAttempt(200, 19, { plan: { 19: '4' } }).b, 0);
// GMS trace restore destinations
assert.deepStrictEqual([15, 20, 21, 22, 23, 26].map((x) => C.sfDest(x, {})), [12, 12, 17, 17, 19, 20]);
// Optimizer never increases expected cost, and with expensive booms it safeguards
const opt = C.sfOptimizePlan(200, 15, 22, { starCatch: true }, 5e9);
assert.ok(opt.cost <= C.sfExpected(200, 15, 22, { starCatch: true }, 5e9).cost + 1);
assert.ok(['sg', '2', '3'].includes(opt.plan[15]), 'expensive booms → protect 15★');

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

// v.269 Enhancement Modes reproduce the community-published boom rates (with star catching)
const PUB = { 15: [2.05, 1.37, 0.69], 17: [6.74, 4.21, 1.69], 18: [6.74, 4.37, 1.79], 19: [8.43, 6.12, 3.58], 20: [10.27, 7.38, 3.95], 21: [12.64, 8.74, 4.47] };
for (const st of Object.keys(PUB)) PUB[st].forEach((v, i) => {
  near(C.sfAttempt(200, +st, { starCatch: true, plan: { [st]: String(i + 1) } }).b * 100, v, 0.015, `mode ${i + 1} @${st}★`);
});
assert.strictEqual(C.sfAttempt(200, 19, { plan: { 19: '4' } }).costMult, 6.5);
assert.strictEqual(C.sfAttempt(200, 16, { plan: { 16: '3' } }).costMult, 2.5);
near(C.sfAttempt(200, 18, { plan: { 18: '4' } }).p, 0.08, 1e-12, 'mode 4 success');

// HEXA cost tables match community totals
const sum = (a) => a.reduce((x, y) => x + y, 0);
assert.deepStrictEqual([sum(D.HEXA_COSTS.origin.frag), sum(D.HEXA_COSTS.mastery.frag), sum(D.HEXA_COSTS.enhance.frag), sum(D.HEXA_COSTS.common.frag)], [4400, 2252, 3383, 6268]);
assert.deepStrictEqual([sum(D.HEXA_COSTS.origin.erda), sum(D.HEXA_COSTS.mastery.erda), sum(D.HEXA_COSTS.enhance.erda), sum(D.HEXA_COSTS.common.erda)], [145, 83, 123, 208]);

// Familiar options use community odds
const fo = C.familiarOptions(s, boss);
assert.ok(fo.some((f) => Math.round(f.rerolls) === 130));

// Seed rings: every ring helps, Mu Lung respects the 80F cap
for (const r of C.ringTable(s)) assert.ok(r.gain > 0, r.label);
assert.ok(C.dojoEstimate(s).floor <= 80);

console.log('all calc tests passed');
