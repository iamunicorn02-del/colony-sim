import { Tile, City } from '@/app/types/tiles';
import type { TradeLink } from '@/app/lib/worldSocket';
import styles from './TileInspector.module.css';

interface TileInspectorProps {
    selectedTile: Tile | null;
    selectedCity: City | null;
    tradeLinks: TradeLink[];
}

export function TileInspector({ selectedTile, selectedCity, tradeLinks }: TileInspectorProps) {
    const cityTrades = selectedCity
        ? tradeLinks.filter(
              (t) => t.sellerId === selectedCity.id || t.buyerId === selectedCity.id
          )
        : [];

    return (
    <aside className={styles.inspector} aria-live="polite">
            <span className={styles.inspectorTitle}>
            {selectedCity ? 'City inspector' : 'Tile inspector'}
            </span>
            {selectedCity ? (
            <>
                <span>Name: {selectedCity.name}</span>
                <span>X: {selectedCity.x}</span>
                <span>Y: {selectedCity.y}</span>
                <span>Population: {selectedCity.population}</span>
                <span>Food: {selectedCity.food}</span>
                <span>Gold: {selectedCity.gold}</span>
                {cityTrades.length > 0 && (
                    <span className={styles.tradeHeader}>Trade routes:</span>
                )}
                {cityTrades.map((t, i) => (
                    <span key={i} className={styles.tradeEntry}>
                        {t.sellerId === selectedCity.id
                            ? `→ sells ${t.food} food for ${t.gold} gold`
                            : `← buys ${t.food} food for ${t.gold} gold`}
                    </span>
                ))}
            </>
            ) : selectedTile ? (
            <>
                <span>Type: {selectedTile.type}</span>
                <span>X: {selectedTile.x}</span>
                <span>Y: {selectedTile.y}</span>
            </>
            ) : (
            <span>No tile selected</span>
            )}
        </aside>
    );
}