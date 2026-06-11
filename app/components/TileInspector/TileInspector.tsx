import { CityTrait, Tile, City, Event } from '@/app/types/tiles';
import type { TradeLink } from '@/app/lib/worldSocket';
import styles from './TileInspector.module.css';

const TRAIT_LABELS: Record<CityTrait, string> = {
  [CityTrait.WARLIKE]: '⚔ Воинственный',
  [CityTrait.TRADER]: '⚖ Торговый',
  [CityTrait.AGRICULTURAL]: '🌾 Земледельческий',
  [CityTrait.FORTUNATE]: '🍀 Удачливый',
  [CityTrait.DOOMED]: '💀 Несчастный',
  [CityTrait.EXPANSIONIST]: '🏗 Расширитель',
  [CityTrait.ISOLATED]: '🏔 Изолированный',
};

const STATUS_LABELS: Record<string, string> = {
  starving: 'Голодает',
  struggling: 'Бедствует',
  stable: 'Стабильно',
  thriving: 'Процветает',
  golden_age: '✨ Золотой век',
  dark_age: '💀 Тёмные времена',
};

interface TileInspectorProps {
  selectedTile: Tile | null;
  selectedCity: City | null;
  tradeLinks: TradeLink[];
  eventLog: Event[];
  worldCities: City[];
}

export function TileInspector({ selectedTile, selectedCity, tradeLinks, eventLog, worldCities }: TileInspectorProps) {
  const cityTrades = selectedCity
    ? tradeLinks.filter(
        (t) => t.sellerId === selectedCity.id || t.buyerId === selectedCity.id,
      )
    : [];

  // Last 5 events that affected this city.
  const cityEvents = selectedCity
    ? eventLog
        .slice()
        .reverse()
        .filter((e) => e.affectedCityIds?.includes(selectedCity.id))
        .slice(0, 5)
    : [];

  // Relationships with other cities (city id → city name mappings).
  const relationshipEntries = selectedCity
    ? Object.entries(selectedCity.relationships)
        .map(([id, rel]) => {
          const name = worldCities.find((c) => c.id === id)?.name ?? id;
          return { id, name, rel };
        })
        .filter((r) => r.rel !== 'neutral')
    : [];

  return (
    <aside className={styles.inspector} aria-live="polite">
      <span className={styles.inspectorTitle}>
        {selectedCity ? 'City inspector' : 'Tile inspector'}
      </span>
      {selectedCity ? (
        <>
          <span><strong>{selectedCity.name}</strong></span>
          <span>X: {selectedCity.x} &nbsp; Y: {selectedCity.y}</span>
          <span>Население: {selectedCity.humanIds.length}</span>
          <span>Еда: {selectedCity.food}</span>
          <span>Золото: {selectedCity.gold}</span>
          <span>
            Статус:{' '}
            <span style={{ color: selectedCity.status.color }}>
              {STATUS_LABELS[selectedCity.status.state] || selectedCity.status.state}
            </span>
          </span>

          {/* Active state timers */}
          {(selectedCity.goldenAgeDays > 0 || selectedCity.darkAgeDays > 0 || selectedCity.epidemicDays > 0) && (
            <span className={styles.timersHeader}>Активные состояния:</span>
          )}
          {selectedCity.goldenAgeDays > 0 && (
            <span className={styles.timerEntry_golden}>✨ Золотой век: {selectedCity.goldenAgeDays} дн.</span>
          )}
          {selectedCity.darkAgeDays > 0 && (
            <span className={styles.timerEntry_dark}>💀 Тёмные времена: {selectedCity.darkAgeDays} дн.</span>
          )}
          {selectedCity.epidemicDays > 0 && (
            <span className={styles.timerEntry_epidemic}>🦠 Эпидемия: {selectedCity.epidemicDays} дн.</span>
          )}

          {selectedCity.traits.length > 0 && (
            <span className={styles.traitsHeader}>Черты:</span>
          )}
          {selectedCity.traits.map((trait) => (
            <span key={trait} className={styles.traitEntry}>
              {TRAIT_LABELS[trait] || trait}
            </span>
          ))}

          {/* Relationships with other cities */}
          {relationshipEntries.length > 0 && (
            <span className={styles.relationsHeader}>Отношения:</span>
          )}
          {relationshipEntries.map(({ id, name, rel }) => (
            <span key={id} className={styles.relationEntry}>
              {rel === 'ally' ? '🤝' : '⚔️'} {name}
            </span>
          ))}

          {cityTrades.length > 0 && (
            <span className={styles.tradeHeader}>Торговые маршруты:</span>
          )}
          {cityTrades.map((t, i) => (
            <span key={i} className={styles.tradeEntry}>
              {t.sellerId === selectedCity.id
                ? `→ продаёт ${t.food} еды за ${t.gold} золота`
                : `← покупает ${t.food} еды за ${t.gold} золота`}
            </span>
          ))}

          {/* City event history */}
          {cityEvents.length > 0 && (
            <span className={styles.historyHeader}>Последние события:</span>
          )}
          {cityEvents.map((e) => (
            <span key={e.id} className={styles.historyEntry}>
              Day {e.day}: {e.message}
            </span>
          ))}
        </>
      ) : selectedTile ? (
        <>
          <span>Тип: {selectedTile.type}</span>
          <span>X: {selectedTile.x}</span>
          <span>Y: {selectedTile.y}</span>
        </>
      ) : (
        <span>Ничего не выбрано</span>
      )}
    </aside>
  );
}
