import { CityTrait, Tile, City } from '@/app/types/tiles';
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
}

export function TileInspector({ selectedTile, selectedCity, tradeLinks }: TileInspectorProps) {
  const cityTrades = selectedCity
    ? tradeLinks.filter(
        (t) => t.sellerId === selectedCity.id || t.buyerId === selectedCity.id,
      )
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
          <span>Население: {selectedCity.population}</span>
          <span>Еда: {selectedCity.food}</span>
          <span>Золото: {selectedCity.gold}</span>
          <span>
            Статус:{' '}
            <span style={{ color: selectedCity.status.color }}>
              {STATUS_LABELS[selectedCity.status.state] || selectedCity.status.state}
            </span>
          </span>
          {selectedCity.traits.length > 0 && (
            <span className={styles.traitsHeader}>Черты:</span>
          )}
          {selectedCity.traits.map((trait) => (
            <span key={trait} className={styles.traitEntry}>
              {TRAIT_LABELS[trait] || trait}
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
