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

- **Multiple characters.** Switch characters from the header. Each one keeps its own stats, gear, familiars, HEXA and settings, saved in the browser.
- **Gear tab with item pictures.** A catalog of widely used items (Arcane, Absolab, Eternal, CRA, Tyrant, Gollux, Pitched Boss, Dawn and more). Icons are the game's item art from maplestory.io, looked up by name, and you can paste an item ID for anything else.
- **Boss income.** Mule groups with Hlom (Hard Lotus), Ctene (Chaos Tenebris), BM and Hard Seren presets, or your saved characters' estimated clears. It applies the 14-per-character and 180-per-world crystal limits, spreads monthly Black Mage over the month, and has editable crystal prices.
- **Light and dark themes.** Follows your system until you pick one. Font is Helvetica.

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

## Community data used

- **Star Force Enhancement Modes (v.269).**
  - Cost multipliers: 15–17★ 1 / 1.5 / 2.5× (Safeguard 3×); 18–21★ 1 / 2 / 3.5 / 6.5×.
  - Success: 18/19/21★ 15 → 12 / 10 / 8%; 20★ 30 → 25 / 20%.
  - Boom rates reproduce the published tables exactly.
  - Sources: NamuWiki GMS section, tadeucci v269 calculator.
- **Familiars.** GMS Upgrade Tracker sample odds: Legendary Boss 50% is 1 in 130 on line 1 and 1 in 13,000 on line 2; IED 50% is 1 in 190 / 1 in 20,000. Presets use realistic single-line familiars.
- **Bosses.** maplerhouse / MapleHub 2026 HP tables. Baldrix needs 700 Sacred Power (MapleStory Wiki).
- **HEXA.** Fragment and Sol Erda tables match the community totals: Origin 4,400/145, Mastery 2,252/83, Boost 3,383/123, Common 6,268/208.
- **Potential.** GMS 13% tier at level 151+. KMS official option odds (9.76% prime / 7.26% non-prime main stat).
- **Seed rings.** Restraint, Continuous and Weapon Jump values from patch notes and the wiki.
- **Mu Lung.** Floor DEF by range, the −90% final damage, and the 40F boss HP (StrategyWiki).

## Accuracy notes

GMS has no public gear API like KMS's Nexon Open API, so input is manual. Boss data comes from 2026 community tables. Entries marked ≈ are approximate and can be edited on the **Data** tab. Cube and familiar line odds, HEXA growth curves, some seed rings and Mu Lung are approximations, and every price is a user input. See the in-app **Guide** tab for formulas.

## Tests

```
node scouter/tests/calc.test.js
```
