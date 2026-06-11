import { City, TileMap } from '../app/types/tiles';
import {
  TRADE_RADIUS,
  TRADE_SURPLUS_FRACTION,
  TRADE_PRICE_PER_FOOD,
  FOOD_STORAGE_PER_CAPITA,
  FOOD_CONSUMPTION_PER_CAPITA,
} from '../app/config';

export interface TradeLink {
  sellerId: string;
  buyerId: string;
  food: number;
  gold: number;
}

/**
 * A city sells when it has more than ~10 days of food stored per citizen.
 * This means it has a large comfortable surplus it can safely trade away.
 */
const hasFoodSurplus = (city: City): boolean => {
  const threshold = city.population * FOOD_CONSUMPTION_PER_CAPITA * 10;
  return city.food > threshold;
};

/**
 * A city buys when it has less than ~1 day of food stored per citizen.
 * It is close to starvation and urgently needs to replenish.
 */
const hasFoodDeficit = (city: City): boolean => {
  const threshold = city.population * FOOD_CONSUMPTION_PER_CAPITA * 1;
  return city.food < threshold;
};

const distance = (a: City, b: City): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Resolve all trade deals for the current day.
 * For each pair of cities within TRADE_RADIUS where one has a surplus and
 * the other a deficit, execute a single trade.
 *
 * Returns the updated cities array and a list of TradeLink records for
 * logging / visualisation.
 */
export const resolveTrades = (
  cities: City[],
  _map: TileMap,
): { cities: City[]; trades: TradeLink[] } => {
  const trades: TradeLink[] = [];
  // Work on a mutable copy so each trade sees the previous one's effect.
  const updated = cities.map((c) => ({ ...c }));

  for (let i = 0; i < updated.length; i++) {
    const seller = updated[i];
    if (!hasFoodSurplus(seller)) continue;

    for (let j = 0; j < updated.length; j++) {
      if (i === j) continue;
      const buyer = updated[j];
      if (!hasFoodDeficit(buyer)) continue;
      if (distance(seller, buyer) > TRADE_RADIUS) continue;

      // How much food the seller is willing to part with (everything above the 10-day safety reserve).
      const surplus = seller.food - seller.population * FOOD_CONSUMPTION_PER_CAPITA * 10;
      const foodToSell = Math.max(1, Math.floor(surplus * TRADE_SURPLUS_FRACTION));

      // How much the buyer can afford.
      const maxAffordable = Math.floor(buyer.gold / TRADE_PRICE_PER_FOOD);
      if (maxAffordable <= 0) continue;

      // How much the buyer can actually store.
      const storageCap = buyer.population * FOOD_STORAGE_PER_CAPITA;
      const storageRoom = Math.max(0, storageCap - buyer.food);

      const food = Math.min(foodToSell, maxAffordable, storageRoom);
      if (food <= 0) continue;

      const gold = food * TRADE_PRICE_PER_FOOD;

      updated[i] = { ...seller, food: seller.food - food, gold: seller.gold + gold };
      updated[j] = { ...buyer, food: buyer.food + food, gold: buyer.gold - gold };

      trades.push({
        sellerId: seller.id,
        buyerId: buyer.id,
        food,
        gold,
      });

      // Re-read seller state for subsequent iterations.
      break; // one deal per seller per tick to keep it simple
    }
  }

  return { cities: updated, trades };
};
