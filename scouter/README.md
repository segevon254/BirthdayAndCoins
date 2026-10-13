# GMS Scouter

A MapleScouter-style spec calculator, adapted for **GMS**. It's a static site with no build step: open `scouter/index.html`, or serve the repo with GitHub Pages.

## Features

| MapleScouter feature | Here |
| --- | --- |
| 환산 주스탯 (converted stat) | **Scouter Score**: main-stat equivalent vs a 300% PDR boss. **HEXA Score** also counts HEXA progress |
| 보스컷 (boss cut) | Estimated % per GMS boss, from real HP, PDR, Arcane/Sacred requirements, level and time limit. Includes solo clear time and party size needed |
| Calibration | Enter one real solo clear and every estimate rescales to your class |
| 스펙 효율 (efficiency) | Value of 1% Boss / IED / CD / ATT / stat etc. against any boss, in flat main stat |
| 시드링 효율 | Seed ring comparison using your burst share |
| 스펙 최적화 | Hyper stat optimizer, legion board optimizer |
| HEXA 최적화 | HEXA upgrade order by damage per fragment |
| 아이템 메이커 | Item Maker: compare old vs new item, see boss changes, add it to the upgrade list |
| 무릉 예상 층수 | Mu Lung estimate (experimental) |
| 도핑 | Bossing buff toggles (Echo, potions, guild skills, MVP) |
| Ranking / search | Saved characters, comparison table, share links, JSON import/export |

GMS-specific additions:

- **Familiars**: quick builder with presets, tier-based auto values, the 120% familiar Boss cap, badges, and reroll suggestions with expected cost.
- **Upgrades: cost vs gain**: Star Force (exact Markov expectation plus Monte-Carlo median and p90, events, safeguard, MVP), Potential (cube line odds), Familiars, HEXA, Hyper, Legion, symbols and custom items. Each is ranked by damage gain per 1B mesos, with the bosses it unlocks.
- **Budget planner**: a greedy upgrade path for a given meso budget.
- **Star Force simulator**: the GMS v.264+ system.
  - Rates: no star drops on failure, 30★ cap.
  - Costs: the new per-star cost divisors.
  - Booms: GMS trace-restore stars (≤20★→12, 21–22→17, 23–25→19, 26+→20).
  - Strategy per stage: Safeguard on the 15→16 / 16→17 / 17→18 attempts (+200% of base cost, not discounted), or v.269 Enhancement Modes 1–4 (15–21★, Mode 4 no-boom from 18★).
  - An auto-picker chooses the cheapest expected strategy for each stage.
- **Editable data**: boss table overrides and custom bosses.

## Accuracy notes

GMS has no public gear API like KMS's Nexon Open API, so input is manual. Boss data comes from 2026 community tables. Entries marked ≈ are approximate and can be edited on the **Data** tab. Cube and familiar line odds, HEXA growth curves, some seed rings and Mu Lung are approximations, and every price is a user input. See the in-app **Guide** tab for formulas.

## Tests

```
node scouter/tests/calc.test.js
```
