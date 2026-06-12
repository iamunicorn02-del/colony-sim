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
import {
  GOLDEN_AGE_FOOD_BONUS_MULT,
  GOLDEN_AGE_GOLD_BONUS_MULT,
  GOLDEN_AGE_DURATION_DAYS,
  DARK_AGE_GOLD_LOSS_FRAC,
  DARK_AGE_DURATION_DAYS,
  DROUGHT_RESISTANCE_MULT,
  DROUGHT_FOOD_LOSS_FRAC,
  DROUGHT_FOOD_THRESHOLD_MULT,
  FLOOD_RESISTANCE_MULT,
  FLOOD_FOOD_LOSS_FRAC,
  FLOOD_WATER_SEARCH_RADIUS,
  EPIDEMIC_RESISTANCE_MULT,
  EPIDEMIC_POP_LOSS_RANGE,
  EPIDEMIC_DURATION_DAYS,
  EPIDEMIC_SPREAD_CHANCE,
  EPIDEMIC_SPREAD_POP_LOSS,
  EPIDEMIC_SPREAD_DURATION_DAYS,
  EPIDEMIC_MIN_POPULATION,
  CONFLICT_POP_LOSS_RANGE,
  FORTUNATE_BONUS_CHANCE,
  DOOMED_MISFORTUNE_CHANCE,
  COLONY_MIN_POPULATION,
  COLONY_MIN_GOLD,
  COLONY_MAX_ATTEMPTS,
  COLONY_SEARCH_RADIUS,
  COLONY_MIN_CITY_DISTANCE,
  COLONY_COLONIST_FRAC,
  COLONY_FOOD_FRAC,
  COLONY_STARTING_GOLD,
  COLONY_PARENT_GOLD_COST,
  CARAVAN_SURPLUS_THRESHOLD_MULT,
  EVENT_GENERATION_MAX_ATTEMPTS,
  PLAGUE_RESISTANCE_BASE,
  FORTUNATE_DARK_AGE_RESIST_CHANCE,
  FORTUNATE_GOLD_BONUS_RANGE,
  DOOMED_FOOD_LOSS_RANGE,
  ALLIANCE_GOLD_BONUS_RANGE,
  CARAVAN_FOOD_TRADED_RANGE,
  CARAVAN_GOLD_TRADED_RANGE,
} from './config/serverConfig';

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
      if (isResisted(city, PLAGUE_RESISTANCE_BASE)) return null;
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
      const foodBonus = Math.floor(city.humanIds.length * GOLDEN_AGE_FOOD_BONUS_MULT);
      const goldBonus = Math.floor(city.humanIds.length * GOLDEN_AGE_GOLD_BONUS_MULT);
      const updated: City = {
        ...city,
        food: city.food + foodBonus,
        gold: city.gold + goldBonus,
        goldenAgeDays: GOLDEN_AGE_DURATION_DAYS,
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
      if (city.traits.includes(CityTrait.FORTUNATE) && Math.random() < FORTUNATE_DARK_AGE_RESIST_CHANCE) return null;
      const goldLoss = Math.floor(city.gold * DARK_AGE_GOLD_LOSS_FRAC);
      const updated: City = {
        ...city,
        gold: Math.max(0, city.gold - goldLoss),
        darkAgeDays: DARK_AGE_DURATION_DAYS,
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
      if (city.food > city.humanIds.length * FOOD_CONSUMPTION_PER_CAPITA * DROUGHT_FOOD_THRESHOLD_MULT) return null;
      if (isResisted(city, DROUGHT_RESISTANCE_MULT)) return null;
      const loss = Math.floor(city.food * DROUGHT_FOOD_LOSS_FRAC);
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
      if (Math.random() > FORTUNATE_BONUS_CHANCE) return null;
      const goldBonus = getRandomInt(FORTUNATE_GOLD_BONUS_RANGE.min, FORTUNATE_GOLD_BONUS_RANGE.max);
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
      if (Math.random() > DOOMED_MISFORTUNE_CHANCE) return null;
      const foodLoss = getRandomInt(DOOMED_FOOD_LOSS_RANGE.min, DOOMED_FOOD_LOSS_RANGE.max);
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
          c.humanIds.length >= COLONY_MIN_POPULATION &&
          c.gold >= COLONY_MIN_GOLD,
      );
      if (!parent) return null;

      // Find a free grass tile near the parent city
      const map = world.map;
      let bestX = -1;
      let bestY = -1;
      for (let attempt = 0; attempt < COLONY_MAX_ATTEMPTS; attempt++) {
        const dx = getRandomInt(-COLONY_SEARCH_RADIUS, COLONY_SEARCH_RADIUS);
        const dy = getRandomInt(-COLONY_SEARCH_RADIUS, COLONY_SEARCH_RADIUS);
        const x = parent.x + dx;
        const y = parent.y + dy;
        if (x < 0 || x >= map[0].length || y < 0 || y >= map.length) continue;
        if (map[y][x].type !== 'grass') continue;
        // Must be far enough from all existing cities
        const tooClose = world.cities.some(
          (c) => Math.hypot(c.x - x, c.y - y) < COLONY_MIN_CITY_DISTANCE,
        );
        if (tooClose) continue;
        bestX = x;
        bestY = y;
        break;
      }
      if (bestX === -1) return null;

      const colonyName = parent.name + ' Colony';
      const colonistsCount = Math.floor(parent.humanIds.length * COLONY_COLONIST_FRAC);
      const colonists = parent.humanIds.slice(0, colonistsCount);
      const colony: City = {
        id: `city-${world.cities.length + 1}-${Date.now()}`,
        name: colonyName,
        x: bestX,
        y: bestY,
        humanIds: colonists,
        food: Math.floor(parent.food * COLONY_FOOD_FRAC),
        gold: COLONY_STARTING_GOLD,
        traits: [],
        status: { state: 'stable', color: CITY_STATUS_COLORS.stable },
        relationships: { [parent.id]: 'ally' },
        goldenAgeDays: 0,
        darkAgeDays: 0,
        epidemicDays: 0,
      };
      colony.status = { state: 'stable', color: CITY_STATUS_COLORS.stable };

      // Parent loses colonists and gold
      const updatedParent: City = {
        ...parent,
        humanIds: parent.humanIds.slice(colonistsCount),
        gold: parent.gold - COLONY_PARENT_GOLD_COST,
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

      const lossA = Math.ceil(a.humanIds.length * getRandomFloat(CONFLICT_POP_LOSS_RANGE.min, CONFLICT_POP_LOSS_RANGE.max));
      const lossB = Math.ceil(b.humanIds.length * getRandomFloat(CONFLICT_POP_LOSS_RANGE.min, CONFLICT_POP_LOSS_RANGE.max));
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

      const goldBonus = getRandomInt(ALLIANCE_GOLD_BONUS_RANGE.min, ALLIANCE_GOLD_BONUS_RANGE.max);
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
      for (let dy = -FLOOD_WATER_SEARCH_RADIUS; dy <= FLOOD_WATER_SEARCH_RADIUS && !nearWater; dy++) {
        for (let dx = -FLOOD_WATER_SEARCH_RADIUS; dx <= FLOOD_WATER_SEARCH_RADIUS && !nearWater; dx++) {
          const x = city.x + dx;
          const y = city.y + dy;
          if (x >= 0 && x < map[0].length && y >= 0 && y < map.length) {
            if (map[y][x].type === 'water') nearWater = true;
          }
        }
      }
      if (!nearWater) return null;
      if (isResisted(city, FLOOD_RESISTANCE_MULT)) return null;

      const loss = Math.floor(city.food * FLOOD_FOOD_LOSS_FRAC);
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
        (c) => !c.traits.includes(CityTrait.ISOLATED) && c.humanIds.length >= EPIDEMIC_MIN_POPULATION,
      );
      if (candidates.length === 0) return null;
      const origin = pickRandom(candidates);
      if (isResisted(origin, EPIDEMIC_RESISTANCE_MULT)) return null;

      const loss = Math.ceil(origin.humanIds.length * getRandomFloat(EPIDEMIC_POP_LOSS_RANGE.min, EPIDEMIC_POP_LOSS_RANGE.max));
      const updated: City = {
        ...origin,
        humanIds: origin.humanIds.slice(loss),
        epidemicDays: EPIDEMIC_DURATION_DAYS,
      };

      // Spread to nearby non-isolated cities
      let newCities = world.cities.map((c) => (c.id === origin.id ? updated : c));
      const spreadTargets = newCities.filter(
        (c) =>
          c.id !== origin.id &&
          !c.traits.includes(CityTrait.ISOLATED) &&
          c.epidemicDays === 0 &&
          Math.hypot(c.x - origin.x, c.y - origin.y) <= TRADE_RADIUS &&
          Math.random() < EPIDEMIC_SPREAD_CHANCE,
      );

      for (const target of spreadTargets) {
        const spreadLoss = Math.ceil(target.humanIds.length * EPIDEMIC_SPREAD_POP_LOSS);
        const spreadUpdated: City = {
          ...target,
          humanIds: target.humanIds.slice(spreadLoss),
          epidemicDays: EPIDEMIC_SPREAD_DURATION_DAYS,
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

      const foodTraded = getRandomInt(CARAVAN_FOOD_TRADED_RANGE.min, CARAVAN_FOOD_TRADED_RANGE.max);
      const goldTraded = getRandomInt(CARAVAN_GOLD_TRADED_RANGE.min, CARAVAN_GOLD_TRADED_RANGE.max);

      // Only trade if the seller has surplus
      if (city.food < city.humanIds.length * FOOD_CONSUMPTION_PER_CAPITA * CARAVAN_SURPLUS_THRESHOLD_MULT) return null;

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

  for (let attempt = 0; attempt < EVENT_GENERATION_MAX_ATTEMPTS; attempt++) {
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
