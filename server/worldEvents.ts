import {
  City,
  CityTrait,
  Event,
  EventKind,
  EventSeverity,
  World,
} from '../app/types/tiles';
import {
  EVENT_DAILY_CHANCE,
  HARVEST_FOOD_BONUS_RANGE,
  PLAGUE_POPULATION_LOSS_RATE,
  TRAIT_EVENT_RESIST,
  FOOD_CONSUMPTION_PER_CAPITA,
  CITY_STATUS_THRESHOLDS,
  CITY_STATUS_COLORS,
  TRADE_RADIUS,
} from '../app/config';

const getRandomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const getRandomFloat = (min: number, max: number) =>
  Math.random() * (max - min) + min;

const pickRandom = <T>(items: T[]): T =>
  items[Math.floor(Math.random() * items.length)];

// --- Trait-based helpers ---------------------------------------------------

const eventResistance = (city: City): number =>
  city.traits.reduce((sum, t) => sum + (TRAIT_EVENT_RESIST[t] || 0), 0);

const isResisted = (city: City, baseChance: number): boolean =>
  Math.random() < eventResistance(city) * baseChance;

// --- Event definition -------------------------------------------------------

interface EventDef {
  kind: EventKind;
  weight: number;
  severity: EventSeverity;
  apply: (world: World) => { world: World; message: string; affectedCityIds: string[] } | null;
}

// Helper: find a second city within TRADE_RADIUS that isn't the same city.
const findNearbyCity = (world: World, city: City): City | null => {
  const nearby = world.cities.filter(
    (c) =>
      c.id !== city.id &&
      Math.hypot(c.x - city.x, c.y - city.y) <= TRADE_RADIUS,
  );
  return nearby.length > 0 ? pickRandom(nearby) : null;
};

const EVENT_DEFS: EventDef[] = [
  // 1. Bountiful harvest
  {
    kind: 'harvest',
    weight: 3,
    severity: 'minor',
    apply: (world) => {
      const city = pickRandom(world.cities);
      const bonus = getRandomInt(HARVEST_FOOD_BONUS_RANGE.min, HARVEST_FOOD_BONUS_RANGE.max);
      const updated: City = { ...city, food: city.food + bonus };
      return {
        world: { ...world, cities: world.cities.map((c) => (c.id === city.id ? updated : c)) },
        message: `🌾 Bountiful harvest in ${city.name}: +${bonus} food`,
        affectedCityIds: [city.id],
      };
    },
  },

  // 2. Plague
  {
    kind: 'plague',
    weight: 2,
    severity: 'major',
    apply: (world) => {
      const city = pickRandom(world.cities);
      if (isResisted(city, 1)) return null;
      const rate = getRandomFloat(PLAGUE_POPULATION_LOSS_RATE.min, PLAGUE_POPULATION_LOSS_RATE.max);
      const lost = Math.ceil(city.humanIds.length * rate);
      const actualLost = Math.min(lost, city.humanIds.length);
      const updated: City = { ...city, humanIds: city.humanIds.slice(lost) };
      return {
        world: { ...world, cities: world.cities.map((c) => (c.id === city.id ? updated : c)) },
        message: `☠️ Plague strikes ${city.name}: -${actualLost} population`,
        affectedCityIds: [city.id],
      };
    },
  },

  // 3. Golden age
  {
    kind: 'golden_age',
    weight: 1,
    severity: 'major',
    apply: (world) => {
      const city = pickRandom(world.cities);
      const ratio = city.food / (city.humanIds.length * FOOD_CONSUMPTION_PER_CAPITA);
      if (ratio < CITY_STATUS_THRESHOLDS.thriving) return null;
      if (city.traits.includes(CityTrait.DOOMED)) return null;
      const foodBonus = Math.floor(city.humanIds.length * 0.5);
      const goldBonus = Math.floor(city.humanIds.length * 0.2);
      const updated: City = {
        ...city,
        food: city.food + foodBonus,
        gold: city.gold + goldBonus,
        goldenAgeDays: 10,
        status: { state: 'golden_age', color: CITY_STATUS_COLORS.golden_age },
      };
      return {
        world: { ...world, cities: world.cities.map((c) => (c.id === city.id ? updated : c)) },
        message: `✨ Golden age begins in ${city.name}! +${foodBonus} food, +${goldBonus} gold`,
        affectedCityIds: [city.id],
      };
    },
  },

  // 4. Dark age
  {
    kind: 'dark_age',
    weight: 1,
    severity: 'major',
    apply: (world) => {
      const city = pickRandom(world.cities);
      const ratio = city.food / (city.humanIds.length * FOOD_CONSUMPTION_PER_CAPITA);
      if (ratio >= CITY_STATUS_THRESHOLDS.struggling) return null;
      if (city.traits.includes(CityTrait.FORTUNATE) && Math.random() < 0.5) return null;
      const goldLoss = Math.floor(city.gold * 0.2);
      const updated: City = {
        ...city,
        gold: Math.max(0, city.gold - goldLoss),
        darkAgeDays: 8,
        status: { state: 'dark_age', color: CITY_STATUS_COLORS.dark_age },
      };
      return {
        world: { ...world, cities: world.cities.map((c) => (c.id === city.id ? updated : c)) },
        message: `💀 Dark age falls upon ${city.name}: -${goldLoss} gold lost to unrest`,
        affectedCityIds: [city.id],
      };
    },
  },

  // 5. Drought
  {
    kind: 'drought',
    weight: 1,
    severity: 'major',
    apply: (world) => {
      const city = pickRandom(world.cities);
      if (city.food > city.humanIds.length * FOOD_CONSUMPTION_PER_CAPITA * 5) return null;
      if (isResisted(city, 0.8)) return null;
      const loss = Math.floor(city.food * 0.3);
      const updated: City = { ...city, food: Math.max(0, city.food - loss) };
      return {
        world: { ...world, cities: world.cities.map((c) => (c.id === city.id ? updated : c)) },
        message: `🏜️ Drought hits ${city.name}: -${loss} food`,
        affectedCityIds: [city.id],
      };
    },
  },

  // 6. Good fortune
  {
    kind: 'fortune',
    weight: 1,
    severity: 'minor',
    apply: (world) => {
      const city = pickRandom(world.cities);
      if (!city.traits.includes(CityTrait.FORTUNATE)) return null;
      if (Math.random() > 0.3) return null;
      const goldBonus = getRandomInt(20, 80);
      const updated: City = { ...city, gold: city.gold + goldBonus };
      return {
        world: { ...world, cities: world.cities.map((c) => (c.id === city.id ? updated : c)) },
        message: `🍀 Good fortune smiles on ${city.name}: +${goldBonus} gold`,
        affectedCityIds: [city.id],
      };
    },
  },

  // 7. Misfortune
  {
    kind: 'misfortune',
    weight: 1,
    severity: 'minor',
    apply: (world) => {
      const city = pickRandom(world.cities);
      if (!city.traits.includes(CityTrait.DOOMED)) return null;
      if (Math.random() > 0.25) return null;
      const foodLoss = getRandomInt(15, 60);
      const updated: City = { ...city, food: Math.max(0, city.food - foodLoss) };
      return {
        world: { ...world, cities: world.cities.map((c) => (c.id === city.id ? updated : c)) },
        message: `🔥 Misfortune strikes ${city.name}: -${foodLoss} food`,
        affectedCityIds: [city.id],
      };
    },
  },

  // 8. Colony founding (Expansionist trait)
  {
    kind: 'colony',
    weight: 1,
    severity: 'major',
    apply: (world) => {
      const parent = world.cities.find(
        (c) =>
          c.traits.includes(CityTrait.EXPANSIONIST) &&
          c.humanIds.length >= 300 &&
          c.gold >= 100,
      );
      if (!parent) return null;

      // Find a free grass tile near the parent city
      const map = world.map;
      let bestX = -1;
      let bestY = -1;
      for (let attempt = 0; attempt < 100; attempt++) {
        const dx = getRandomInt(-8, 8);
        const dy = getRandomInt(-8, 8);
        const x = parent.x + dx;
        const y = parent.y + dy;
        if (x < 0 || x >= map[0].length || y < 0 || y >= map.length) continue;
        if (map[y][x].type !== 'grass') continue;
        // Must be far enough from all existing cities
        const tooClose = world.cities.some(
          (c) => Math.hypot(c.x - x, c.y - y) < 5,
        );
        if (tooClose) continue;
        bestX = x;
        bestY = y;
        break;
      }
      if (bestX === -1) return null;

      const colonyName = parent.name + ' Colony';
      const colonistsCount = Math.floor(parent.humanIds.length * 0.15);
      const colonists = parent.humanIds.slice(0, colonistsCount);
      const colony: City = {
        id: `city-${world.cities.length + 1}-${Date.now()}`,
        name: colonyName,
        x: bestX,
        y: bestY,
        humanIds: colonists,
        food: Math.floor(parent.food * 0.1),
        gold: 20,
        traits: [],
        status: { state: 'stable', color: '#facc15' },
        relationships: { [parent.id]: 'ally' },
        goldenAgeDays: 0,
        darkAgeDays: 0,
        epidemicDays: 0,
      };
      colony.status = { state: 'stable', color: '#facc15' };

      // Parent loses colonists and gold
      const updatedParent: City = {
        ...parent,
        humanIds: parent.humanIds.slice(colonistsCount),
        gold: parent.gold - 50,
        relationships: { ...parent.relationships, [colony.id]: 'ally' },
      };

      const newCities = world.cities
        .map((c) => (c.id === parent.id ? updatedParent : c))
        .concat(colony);

      return {
        world: { ...world, cities: newCities },
        message: `🏛️ ${parent.name} founded a new colony: ${colonyName}`,
        affectedCityIds: [parent.id, colony.id],
      };
    },
  },

  // 9. Conflict (two warlike cities fight)
  {
    kind: 'conflict',
    weight: 1,
    severity: 'major',
    apply: (world) => {
      const warlike = world.cities.filter((c) => c.traits.includes(CityTrait.WARLIKE));
      if (warlike.length < 2) return null;
      const a = pickRandom(warlike);
      const nearby = warlike.filter(
        (c) => c.id !== a.id && Math.hypot(c.x - a.x, c.y - a.y) <= TRADE_RADIUS,
      );
      if (nearby.length === 0) return null;
      const b = pickRandom(nearby);

      const lossA = Math.ceil(a.humanIds.length * getRandomFloat(0.05, 0.15));
      const lossB = Math.ceil(b.humanIds.length * getRandomFloat(0.05, 0.15));
      const updatedA: City = {
        ...a,
        humanIds: a.humanIds.slice(lossA),
        relationships: { ...a.relationships, [b.id]: 'enemy' },
      };
      const updatedB: City = {
        ...b,
        humanIds: b.humanIds.slice(lossB),
        relationships: { ...b.relationships, [a.id]: 'enemy' },
      };

      const newCities = world.cities.map((c) => {
        if (c.id === a.id) return updatedA;
        if (c.id === b.id) return updatedB;
        return c;
      });

      return {
        world: { ...world, cities: newCities },
        message: `⚔️ Conflict between ${a.name} and ${b.name}: -${lossA} / -${lossB} population`,
        affectedCityIds: [a.id, b.id],
      };
    },
  },

  // 10. Alliance (two trader cities form a trade alliance)
  {
    kind: 'alliance',
    weight: 1,
    severity: 'minor',
    apply: (world) => {
      const traders = world.cities.filter((c) => c.traits.includes(CityTrait.TRADER));
      if (traders.length < 2) return null;
      const a = pickRandom(traders);
      const nearby = traders.filter(
        (c) =>
          c.id !== a.id &&
          Math.hypot(c.x - a.x, c.y - a.y) <= TRADE_RADIUS &&
          a.relationships[c.id] !== 'enemy',
      );
      if (nearby.length === 0) return null;
      const b = pickRandom(nearby);

      const goldBonus = getRandomInt(10, 40);
      const updatedA: City = {
        ...a,
        gold: a.gold + goldBonus,
        relationships: { ...a.relationships, [b.id]: 'ally' },
      };
      const updatedB: City = {
        ...b,
        gold: b.gold + goldBonus,
        relationships: { ...b.relationships, [a.id]: 'ally' },
      };

      const newCities = world.cities.map((c) => {
        if (c.id === a.id) return updatedA;
        if (c.id === b.id) return updatedB;
        return c;
      });

      return {
        world: { ...world, cities: newCities },
        message: `🤝 Trade alliance formed between ${a.name} and ${b.name}: +${goldBonus} gold each`,
        affectedCityIds: [a.id, b.id],
      };
    },
  },

  // 11. Flood (reduces food in a city near water)
  {
    kind: 'flood',
    weight: 1,
    severity: 'major',
    apply: (world) => {
      const city = pickRandom(world.cities);
      // Check if city is near water
      const map = world.map;
      let nearWater = false;
      for (let dy = -3; dy <= 3 && !nearWater; dy++) {
        for (let dx = -3; dx <= 3 && !nearWater; dx++) {
          const x = city.x + dx;
          const y = city.y + dy;
          if (x >= 0 && x < map[0].length && y >= 0 && y < map.length) {
            if (map[y][x].type === 'water') nearWater = true;
          }
        }
      }
      if (!nearWater) return null;
      if (isResisted(city, 0.7)) return null;

      const loss = Math.floor(city.food * 0.25);
      const updated: City = { ...city, food: Math.max(0, city.food - loss) };
      return {
        world: { ...world, cities: world.cities.map((c) => (c.id === city.id ? updated : c)) },
        message: `🌊 Flood devastates ${city.name}: -${loss} food washed away`,
        affectedCityIds: [city.id],
      };
    },
  },

  // 12. Epidemic (spreads via trade routes)
  {
    kind: 'epidemic',
    weight: 1,
    severity: 'cataclysmic',
    apply: (world) => {
      // Pick a city that is NOT isolated and has decent population
      const candidates = world.cities.filter(
        (c) => !c.traits.includes(CityTrait.ISOLATED) && c.humanIds.length >= 50,
      );
      if (candidates.length === 0) return null;
      const origin = pickRandom(candidates);
      if (isResisted(origin, 0.6)) return null;

      const loss = Math.ceil(origin.humanIds.length * getRandomFloat(0.08, 0.2));
      const updated: City = {
        ...origin,
        humanIds: origin.humanIds.slice(loss),
        epidemicDays: 5,
      };

      // Spread to nearby non-isolated cities
      let newCities = world.cities.map((c) => (c.id === origin.id ? updated : c));
      const spreadTargets = newCities.filter(
        (c) =>
          c.id !== origin.id &&
          !c.traits.includes(CityTrait.ISOLATED) &&
          c.epidemicDays === 0 &&
          Math.hypot(c.x - origin.x, c.y - origin.y) <= TRADE_RADIUS &&
          Math.random() < 0.4,
      );

      for (const target of spreadTargets) {
        const spreadLoss = Math.ceil(target.humanIds.length * 0.05);
        const spreadUpdated: City = {
          ...target,
          humanIds: target.humanIds.slice(spreadLoss),
          epidemicDays: 3,
        };
        newCities = newCities.map((c) => (c.id === target.id ? spreadUpdated : c));
      }

      const affectedIds = [origin.id, ...spreadTargets.map((c) => c.id)];
      return {
        world: { ...world, cities: newCities },
        message: `🦠 Epidemic erupts in ${origin.name} (spreading along trade routes): -${loss} population`,
        affectedCityIds: affectedIds,
      };
    },
  },

  // 13. Caravan (visual trade event between nearby cities)
  {
    kind: 'caravan',
    weight: 2,
    severity: 'minor',
    apply: (world) => {
      const city = pickRandom(world.cities);
      const partner = findNearbyCity(world, city);
      if (!partner) return null;

      const foodTraded = getRandomInt(5, 25);
      const goldTraded = getRandomInt(5, 20);

      // Only trade if the seller has surplus
      if (city.food < city.humanIds.length * FOOD_CONSUMPTION_PER_CAPITA * 3) return null;

      const updatedSeller: City = {
        ...city,
        food: city.food - foodTraded,
        gold: city.gold + goldTraded,
      };
      const updatedBuyer: City = {
        ...partner,
        food: partner.food + foodTraded,
        gold: Math.max(0, partner.gold - goldTraded),
      };

      const newCities = world.cities.map((c) => {
        if (c.id === city.id) return updatedSeller;
        if (c.id === partner.id) return updatedBuyer;
        return c;
      });

      return {
        world: { ...world, cities: newCities },
        message: `🐪 Caravan from ${city.name} to ${partner.name}: ${foodTraded} food ↔ ${goldTraded} gold`,
        affectedCityIds: [city.id, partner.id],
      };
    },
  },
];

// --- Weighted random pick ---------------------------------------------------

const pickEventDef = (): EventDef => {
  const totalWeight = EVENT_DEFS.reduce((s, d) => s + d.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const def of EVENT_DEFS) {
    roll -= def.weight;
    if (roll <= 0) return def;
  }
  return EVENT_DEFS[0];
};

// --- Public API -------------------------------------------------------------

export const maybeGenerateEvent = (
  world: World,
  day: number,
): { world: World; event: Event } | null => {
  if (world.cities.length === 0) return null;
  if (Math.random() >= EVENT_DAILY_CHANCE) return null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const def = pickEventDef();
    const result = def.apply(world);
    if (!result) continue;

    const { world: newWorld, message, affectedCityIds } = result;

    // Recompute status for all affected cities
    const finalWorld: World = {
      ...newWorld,
      cities: newWorld.cities.map((c) =>
        affectedCityIds.includes(c.id)
          ? { ...c, status: { ...c.status } }
          : c,
      ),
    };

    const event: Event = {
      id: `evt-${day}-${getRandomInt(1000, 9999)}`,
      day,
      message,
      kind: def.kind,
      affectedCityIds,
      severity: def.severity,
    };

    return { world: finalWorld, event };
  }

  return null;
};
