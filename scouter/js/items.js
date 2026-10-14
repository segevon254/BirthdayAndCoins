/*
 * GMS Scouter — catalog of widely used items and in-game icons.
 *
 * Icons are the game's own item art, served by maplestory.io. Most items are
 * looked up by name at runtime (the result is cached in the browser); a few IDs
 * are pinned. If the icon service is unreachable the slot shows a glyph instead.
 */
(function (root) {
  'use strict';

  const ICON_API = 'https://maplestory.io/api/GMS/latest';
  const LS_ICONS = 'gmsScouter.iconIds';

  // Slot types: label, star-forceable kind, potential type, glyph fallback.
  const SLOTS = {
    weapon: { label: 'Weapon', kind: 'weapon', pot: 'att', glyph: '⚔' },
    secondary: { label: 'Secondary', kind: 'acc', pot: 'att', glyph: '🛡' },
    emblem: { label: 'Emblem', kind: 'acc', pot: 'att', glyph: '✦' },
    hat: { label: 'Hat', kind: 'armor', pot: 'stat', glyph: '⛑' },
    top: { label: 'Top', kind: 'armor', pot: 'stat', glyph: '👕' },
    bottom: { label: 'Bottom', kind: 'armor', pot: 'stat', glyph: '👖' },
    shoes: { label: 'Shoes', kind: 'armor', pot: 'stat', glyph: '👢' },
    gloves: { label: 'Gloves', kind: 'armor', pot: 'stat', glyph: '🧤' },
    cape: { label: 'Cape', kind: 'armor', pot: 'stat', glyph: '🧣' },
    shoulder: { label: 'Shoulder', kind: 'armor', pot: 'stat', glyph: '◭' },
    belt: { label: 'Belt', kind: 'armor', pot: 'stat', glyph: '▬' },
    face: { label: 'Face Accessory', kind: 'armor', pot: 'stat', glyph: '☺' },
    eye: { label: 'Eye Accessory', kind: 'armor', pot: 'stat', glyph: '◉' },
    earring: { label: 'Earrings', kind: 'armor', pot: 'stat', glyph: '◈' },
    pendant: { label: 'Pendant', kind: 'armor', pot: 'stat', glyph: '◊' },
    ring: { label: 'Ring', kind: 'armor', pot: 'stat', glyph: '○' },
    heart: { label: 'Heart', kind: 'armor', pot: 'stat', glyph: '♥' },
  };

  // [key, display name, slot, level, icon search name (defaults to display name), pinned id]
  const RAW = [
    // Weapons (icon shows the two-handed sword version)
    ['w_absolab', 'AbsoLab Weapon', 'weapon', 160, 'AbsoLab Two-handed Sword'],
    ['w_arcane', 'Arcane Umbra Weapon', 'weapon', 200, 'Arcane Umbra Two-handed Sword'],
    ['w_genesis', 'Genesis Weapon', 'weapon', 200, 'Genesis Two-handed Sword'],
    ['w_destiny', 'Destiny Weapon', 'weapon', 200, 'Destiny Two-handed Sword'],
    // Emblem
    ['e_gml', 'Gold Maple Leaf Emblem', 'emblem', 100],
    ['e_mitra', "Mitra's Rage", 'emblem', 200],
    // Hats
    ['h_cra', 'Royal Warrior Helm (CRA)', 'hat', 150, 'Royal Warrior Helm'],
    ['h_absolab', 'AbsoLab Knight Helm', 'hat', 160],
    ['h_arcane', 'Arcane Umbra Knight Hat', 'hat', 200],
    ['h_eternal', 'Eternal Knight Helm', 'hat', 250],
    // Tops / bottoms
    ['t_cra', 'Eagle Eye Warrior Armor (CRA)', 'top', 150, 'Eagle Eye Warrior Armor'],
    ['t_eternal', 'Eternal Knight Armor', 'top', 250],
    ['t_arcane', 'Arcane Umbra Knight Suit (overall)', 'top', 200, 'Arcane Umbra Knight Suit'],
    ['b_cra', 'Trixter Warrior Pants (CRA)', 'bottom', 150, 'Trixter Warrior Pants'],
    ['b_eternal', 'Eternal Knight Pants', 'bottom', 250],
    // Shoes / gloves / cape / shoulder
    ['s_tyrant', 'Tyrant Lycaon Boots', 'shoes', 150],
    ['s_absolab', 'AbsoLab Knight Shoes', 'shoes', 160],
    ['s_arcane', 'Arcane Umbra Knight Shoes', 'shoes', 200],
    ['g_tyrant', 'Tyrant Lycaon Gloves', 'gloves', 150],
    ['g_absolab', 'AbsoLab Knight Gloves', 'gloves', 160],
    ['g_arcane', 'Arcane Umbra Knight Gloves', 'gloves', 200],
    ['c_tyrant', 'Tyrant Lycaon Cloak', 'cape', 150],
    ['c_absolab', 'AbsoLab Knight Cape', 'cape', 160],
    ['c_arcane', 'Arcane Umbra Knight Cape', 'cape', 200],
    ['sh_absolab', 'AbsoLab Knight Shoulder', 'shoulder', 160],
    ['sh_arcane', 'Arcane Umbra Knight Shoulder', 'shoulder', 200],
    ['sh_eternal', 'Eternal Knight Shoulder', 'shoulder', 250],
    // Belts
    ['bt_clover', 'Golden Clover Belt', 'belt', 140],
    ['bt_tyrant', 'Tyrant Lycaon Belt', 'belt', 150],
    ['bt_gollux', 'Superior Engraved Gollux Belt', 'belt', 150],
    ['bt_dreamy', 'Dreamy Belt', 'belt', 200],
    // Face / eye
    ['f_cpc', 'Condensed Power Crystal', 'face', 110],
    ['f_twilight', 'Twilight Mark', 'face', 140],
    ['f_berserked', 'Berserked', 'face', 160],
    ['y_aquatic', 'Aquatic Letter Eye Accessory', 'eye', 100],
    ['y_blackbean', 'Black Bean Mark', 'eye', 135],
    ['y_eyepatch', 'Magic Eyepatch', 'eye', 160, null, 1022278],
    // Earrings
    ['er_sidus', 'Dea Sidus Earring', 'earring', 130],
    ['er_gollux', 'Superior Gollux Earrings', 'earring', 150],
    ['er_estella', 'Estella Earrings', 'earring', 160],
    ['er_cfe', 'Commanding Force Earring', 'earring', 200],
    // Pendants
    ['p_dominator', 'Dominator Pendant', 'pendant', 140],
    ['p_daybreak', 'Daybreak Pendant', 'pendant', 140],
    ['p_gollux', 'Superior Gollux Pendant', 'pendant', 150],
    ['p_sos', 'Source of Suffering', 'pendant', 160],
    // Rings
    ['r_meister', 'Meister Ring', 'ring', 140],
    ['r_kanna', "Kanna's Treasure", 'ring', 140],
    ['r_gollux', 'Superior Gollux Ring', 'ring', 150],
    ['r_gar', 'Guardian Angel Ring', 'ring', 160],
    ['r_terror', 'Endless Terror', 'ring', 200],
    // Hearts
    ['ht_black', 'Black Heart', 'heart', 120],
    ['ht_total', 'Total Control', 'heart', 200],
  ];
  const ITEMS = {};
  for (const [key, name, slot, level, search, id] of RAW) ITEMS[key] = { key, name, slot, level, search: search || name, id: id || null };

  const itemsForSlot = (slot) => Object.values(ITEMS).filter((i) => i.slot === slot);

  // Infer a slot type from a free-text slot label ("Ring 2" → ring).
  function slotTypeOf(label) {
    const l = String(label || '').toLowerCase();
    if (l.includes('weapon')) return 'weapon';
    if (l.includes('second')) return 'secondary';
    if (l.includes('emblem')) return 'emblem';
    if (l.includes('hat') || l.includes('helm')) return 'hat';
    if (l.includes('top') || l.includes('overall')) return 'top';
    if (l.includes('bottom') || l.includes('pants')) return 'bottom';
    if (l.includes('shoe')) return 'shoes';
    if (l.includes('glove')) return 'gloves';
    if (l.includes('cape')) return 'cape';
    if (l.includes('shoulder')) return 'shoulder';
    if (l.includes('belt')) return 'belt';
    if (l.includes('face')) return 'face';
    if (l.includes('eye')) return 'eye';
    if (l.includes('ear')) return 'earring';
    if (l.includes('pendant')) return 'pendant';
    if (l.includes('ring')) return 'ring';
    if (l.includes('heart')) return 'heart';
    return 'ring';
  }

  // ---------------------------------------------------------------------------
  // Icon resolution (browser only)
  // ---------------------------------------------------------------------------
  let cache = {};
  try { cache = JSON.parse(root.localStorage.getItem(LS_ICONS) || '{}'); } catch (e) { cache = {}; }
  const saveCache = () => { try { root.localStorage.setItem(LS_ICONS, JSON.stringify(cache)); } catch (e) { /* ignore */ } };
  const pending = {};
  const iconUrl = (id) => `${ICON_API}/item/${id}/icon?resize=2`;

  /** Known numeric id for a search name, or null. */
  function knownId(search, pinned) {
    if (pinned) return pinned;
    const c = cache[search];
    return typeof c === 'number' ? c : null;
  }
  /** Look up an item id by name on maplestory.io; resolves to id or null. */
  function lookup(search) {
    if (cache[search] !== undefined) return Promise.resolve(cache[search]);
    if (pending[search]) return pending[search];
    const words = search.toLowerCase().split(/\s+/);
    pending[search] = fetch(`${ICON_API}/item?searchFor=${encodeURIComponent(search)}&count=40`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        const items = Array.isArray(list) ? list : [];
        const name = (x) => String(x.name || '').toLowerCase();
        const exact = items.find((x) => name(x) === search.toLowerCase());
        const loose = items.find((x) => words.every((w) => name(x).includes(w)));
        const hit = exact || loose;
        cache[search] = hit ? hit.id : null;
        saveCache();
        return cache[search];
      })
      .catch(() => null); // offline / blocked: don't cache, try again next load
    return pending[search];
  }

  /**
   * HTML for an item icon. `item` may be a catalog item or a gear entry with
   * { item, iconId, slotType }. Missing icons resolve asynchronously via hydrate().
   */
  function iconHtml(gear, size) {
    size = size || 40;
    const slot = SLOTS[gear.slotType] || SLOTS.ring;
    const it = gear.item ? ITEMS[gear.item] : null;
    const id = Number(gear.iconId) || (it ? knownId(it.search, it.id) : null);
    const glyph = `<span class="glyph">${slot.glyph}</span>`;
    if (id) return `<span class="icon" style="width:${size}px;height:${size}px"><img src="${iconUrl(id)}" alt="" loading="lazy" onload="this.classList.add('ok')" onerror="this.remove()">${glyph}</span>`;
    if (it) return `<span class="icon" style="width:${size}px;height:${size}px" data-icon-search="${it.search.replace(/"/g, '&quot;')}">${glyph}</span>`;
    return `<span class="icon" style="width:${size}px;height:${size}px">${glyph}</span>`;
  }
  /** Fill in icons that still need a name lookup. */
  function hydrate(container) {
    if (!container || typeof fetch !== 'function') return;
    container.querySelectorAll('[data-icon-search]').forEach((el) => {
      const search = el.getAttribute('data-icon-search');
      el.removeAttribute('data-icon-search');
      lookup(search).then((id) => {
        if (!id || !el.isConnected) return;
        const img = document.createElement('img');
        img.src = iconUrl(id); img.alt = ''; img.loading = 'lazy';
        img.onload = () => img.classList.add('ok');
        img.onerror = () => img.remove();
        el.prepend(img);
      });
    });
  }

  const API = { SLOTS, ITEMS, itemsForSlot, slotTypeOf, iconHtml, hydrate, iconUrl };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.MSItems = API;
})(typeof window !== 'undefined' ? window : globalThis);
