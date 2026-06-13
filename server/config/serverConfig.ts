/**
 * Server-side simulation configuration.
 *
 * All magic numbers that control human needs, behaviour, city ages,
 * world events and trade thresholds live here.  Import from this file
 * instead of hardcoding values in the simulation logic.
 */

// --- Human Needs -----------------------------------------------------------
// How much a human's hunger and energy decrease each tick.
export const HUNGER_DECREASE_RANGE = { min: 5, max: 10 };
export const ENERGY_DECREASE_RANGE = { min: 3, max: 7 };

// Eating: how much food is consumed and hunger restored per tick.
export const FOOD_PER_EAT = 1;
export const HUNGER_RESTORE_RANGE = { min: 45, max: 60 };

// Resting: energy restored per tick.
export const ENERGY_RESTORE_REST_RANGE = { min: 15, max: 20 };

// Health damage when hunger or energy hit zero.
export const STARVATION_HEALTH_DAMAGE_RANGE = { min: 5, max: 10 };
export const EXHAUSTION_HEALTH_DAMAGE_RANGE = { min: 3, max: 7 };

// Health recovery when hunger and energy are above threshold.
export const HEALTH_RECOVERY_RANGE = { min: 2, max: 5 };
export const HEALTH_RECOVERY_HUNGER_THRESHOLD = 50;
export const HEALTH_RECOVERY_ENERGY_THRESHOLD = 50;

// Mood: change ranges and thresholds.
export const MOOD_INCREASE_RANGE = { min: 5, max: 10 };
export const MOOD_DECREASE_RANGE = { min: 3, max: 5 };
export const MOOD_GOOD_THRESHOLD = 60;  // all three stats must exceed this
export const MOOD_BAD_THRESHOLD = 20;   // any stat below this triggers penalty

// Death: critically low health + mood thresholds.
export const DEATH_HEALTH_THRESHOLD = 3;
export const DEATH_MOOD_THRESHOLD = 5;
export const DEATH_CHANCE = 0.5;

// Action-switch triggers: hunger/energy below these → eat / rest.
export const HUNGER_EATING_THRESHOLD = 40;
export const ENERGY_RESTING_THRESHOLD = 70;

// --- Stat Bounds -----------------------------------------------------------
// Floor and ceiling for all human stats (hunger, energy, health, mood).
export const STAT_MIN = 0;
export const STAT_MAX = 100;

// --- Human Behaviour -------------------------------------------------------
// Movement: chance to move each tick and delta range.
export const HUMAN_MOVE_CHANCE = 0.3;
export const HUMAN_MOVE_DELTA_RANGE = { min: -1, max: 1 };

// City initialisation: how many humans spawn per city.
export const HUMANS_PER_CITY_RANGE = { min: 5, max: 10 };

// Spawn offset from city centre (tiles).
export const HUMAN_SPAWN_OFFSET_RANGE = { min: -2, max: 2 };

// Starting stat ranges for newly generated humans.
export const HUMAN_INITIAL_HUNGER_RANGE = { min: 70, max: 100 };
export const HUMAN_INITIAL_ENERGY_RANGE = { min: 70, max: 100 };
export const HUMAN_INITIAL_HEALTH_RANGE = { min: 70, max: 100 };
export const HUMAN_INITIAL_MOOD_RANGE = { min: 60, max: 100 };

// Birth conditions.
export const BIRTH_AVG_MOOD_THRESHOLD = 60;
export const BIRTH_FOOD_SURPLUS_MULTIPLIER = 2;

// --- City Ages -------------------------------------------------------------
// Golden age: production bonuses while active, and founding rewards.
export const GOLDEN_AGE_FOOD_PRODUCTION_MULT = 0.20;
export const GOLDEN_AGE_GOLD_PRODUCTION_MULT = 0.15;
export const GOLDEN_AGE_FOOD_BONUS_MULT = 0.5;
export const GOLDEN_AGE_GOLD_BONUS_MULT = 0.2;
export const GOLDEN_AGE_DURATION_DAYS = 10;

// Dark age: production penalties while active, and triggering penalties.
export const DARK_AGE_FOOD_PRODUCTION_PENALTY = -0.15;
export const DARK_AGE_GOLD_PRODUCTION_PENALTY = -0.20;
export const DARK_AGE_GOLD_LOSS_FRAC = 0.2;
export const DARK_AGE_DURATION_DAYS = 8;

// --- World Events ----------------------------------------------------------
// Plague: base resistance multiplier passed to isResisted().
export const PLAGUE_RESISTANCE_BASE = 1;

// Dark age: FORTUNATE cities have a chance to resist.
export const FORTUNATE_DARK_AGE_RESIST_CHANCE = 0.5;

// Fortune: gold bonus range for FORTUNATE cities.
export const FORTUNATE_GOLD_BONUS_RANGE = { min: 20, max: 80 };

// Misfortune: food loss range for DOOMED cities.
export const DOOMED_FOOD_LOSS_RANGE = { min: 15, max: 60 };

// Alliance: gold bonus range when two trader cities form an alliance.
export const ALLIANCE_GOLD_BONUS_RANGE = { min: 10, max: 40 };

// Caravan: food and gold amounts traded between nearby cities.
export const CARAVAN_FOOD_TRADED_RANGE = { min: 5, max: 25 };
export const CARAVAN_GOLD_TRADED_RANGE = { min: 5, max: 20 };

// Drought.
export const DROUGHT_RESISTANCE_MULT = 0.8;
export const DROUGHT_FOOD_LOSS_FRAC = 0.3;
export const DROUGHT_FOOD_THRESHOLD_MULT = 5;

// Flood.
export const FLOOD_RESISTANCE_MULT = 0.7;
export const FLOOD_FOOD_LOSS_FRAC = 0.25;
export const FLOOD_WATER_SEARCH_RADIUS = 3;

// Epidemic.
export const EPIDEMIC_RESISTANCE_MULT = 0.6;
export const EPIDEMIC_POP_LOSS_RANGE = { min: 0.08, max: 0.2 };
export const EPIDEMIC_DURATION_DAYS = 5;
export const EPIDEMIC_SPREAD_CHANCE = 0.4;
export const EPIDEMIC_SPREAD_POP_LOSS = 0.05;
export const EPIDEMIC_SPREAD_DURATION_DAYS = 3;
export const EPIDEMIC_MIN_POPULATION = 50.

// Conflict.
export const CONFLICT_POP_LOSS_RANGE = { min: 0.05, max: 0.15 };

// Trait-based event chances.
export const FORTUNATE_BONUS_CHANCE = 0.3;
export const DOOMED_MISFORTUNE_CHANCE = 0.25;

// Colony founding.
export const COLONY_MIN_POPULATION = 300;
export const COLONY_MIN_GOLD = 100;
export const COLONY_MAX_ATTEMPTS = 100;
export const COLONY_SEARCH_RADIUS = 8;
export const COLONY_MIN_CITY_DISTANCE = 5;
export const COLONY_COLONIST_FRAC = 0.15;
export const COLONY_FOOD_FRAC = 0.1;
export const COLONY_STARTING_GOLD = 20;
export const COLONY_PARENT_GOLD_COST = 50;

// Caravan.
export const CARAVAN_SURPLUS_THRESHOLD_MULT = 3;

// Event generation.
export const EVENT_GENERATION_MAX_ATTEMPTS = 5;

// --- Trade Thresholds ------------------------------------------------------
// How many days of food a city needs to be considered a surplus seller,
// and how many days (below) to be considered a deficit buyer.
export const TRADE_SURPLUS_DAYS_THRESHOLD = 10;
export const TRADE_DEFICIT_DAYS_THRESHOLD = 1;

// Trait-based trade radius multipliers.
export const ISOLATED_TRADE_RADIUS_MULT = 0.5;
export const TRADER_TRADE_RADIUS_MULT = 1.3;
