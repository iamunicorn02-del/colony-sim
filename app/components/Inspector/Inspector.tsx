import { Tile, City, Event, Human, Poi } from '@/app/types/tiles';
import type { TradeLink } from '@/app/lib/worldSocket';
import styles from './Inspector.module.css';

const TRAIT_LABELS: Record<string, string> = {
  warlike: '⚔ Воинственный',
  trader: '⚖ Торговый',
  agricultural: '🌾 Земледельческий',
  fortunate: '🍀 Удачливый',
  doomed: '💀 Несчастный',
  expansionist: '🏗 Расширитель',
  isolated: '🏔 Изолированный',
};

const STATUS_LABELS: Record<string, string> = {
  starving: 'Голодает',
  struggling: 'Бедствует',
  stable: 'Стабильно',
  thriving: 'Процветает',
  golden_age: '✨ Золотой век',
  dark_age: '💀 Тёмные времена',
};

const ACTION_LABELS: Record<string, string> = {
  idle: 'Отдыхает',
  moving: 'Двигается',
  eating: 'Ест',
  resting: 'Отдыхает',
};

interface InspectorProps {
  selectedTile: Tile | null;
  selectedCity: City | null;
  selectedHuman: Human | null;
  selectedPoi: Poi | null;
  tradeLinks: TradeLink[];
  eventLog: Event[];
  worldCities: City[];
  onClear: () => void;
}

export function Inspector({
  selectedTile,
  selectedCity,
  selectedHuman,
  selectedPoi,
  tradeLinks,
  eventLog,
  worldCities,
  onClear,
}: InspectorProps) {
  const cityTrades = selectedCity
    ? tradeLinks.filter(
        (t) => t.sellerId === selectedCity.id || t.buyerId === selectedCity.id,
      )
    : [];

  const cityEvents = selectedCity
    ? eventLog
        .slice()
        .reverse()
        .filter((e) => e.affectedCityIds?.includes(selectedCity.id))
        .slice(0, 5)
    : [];

  const relationshipEntries = selectedCity
    ? Object.entries(selectedCity.relationships)
        .map(([id, rel]) => {
          const name = worldCities.find((c) => c.id === id)?.name ?? id;
          return { id, name, rel };
        })
        .filter((r) => r.rel !== 'neutral')
    : [];

  // Determine what is being inspected
  let title = 'Inspector';
  let showClear = false;

  if (selectedHuman) {
    title = 'Human';
    showClear = true;
  } else if (selectedCity) {
    title = 'City Inspector';
    showClear = true;
  } else if (selectedPoi) {
    title = selectedPoi.kind === 'ruins' ? '💀 Руины' : selectedPoi.kind === 'bandit_camp' ? '⚔ Лагерь разбойников' : '🕳 Пещера';
    showClear = true;
  } else if (selectedTile) {
    title = 'Tile Inspector';
    showClear = true;
  }

  return (
    <aside className={styles.inspector} aria-live="polite">
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        {showClear && (
          <button className={styles.clearBtn} onClick={onClear} aria-label="Clear selection">
            ✕
          </button>
        )}
      </div>

      {selectedHuman && (
        <HumanSection human={selectedHuman} />
      )}

      {selectedCity && !selectedHuman && (
        <CitySection
          city={selectedCity}
          cityTrades={cityTrades}
          cityEvents={cityEvents}
          relationshipEntries={relationshipEntries}
        />
      )}

      {selectedPoi && !selectedHuman && !selectedCity && (
        <PoiSection poi={selectedPoi} />
      )}

      {selectedTile && !selectedHuman && !selectedCity && !selectedPoi && (
        <TileSection tile={selectedTile} />
      )}

      {!selectedHuman && !selectedCity && !selectedPoi && !selectedTile && (
        <span className={styles.empty}>Ничего не выбрано</span>
      )}
    </aside>
  );
}

// ------------------------------------------------------------------
// Sub-components — each renders a section for its target type
// ------------------------------------------------------------------

function HumanSection({ human }: { human: Human }) {
  const actionClass = styles[`action_${human.currentAction}`] ?? styles.action_idle;
  const hunger = Math.min(100, Math.max(0, human.hunger));
  const energy = Math.min(100, Math.max(0, human.energy));
  const health = Math.min(100, Math.max(0, human.health));
  const mood = Math.min(100, Math.max(0, human.mood));

  return (
    <div className={styles.section}>
      <span className={styles.name}>{human.name}</span>

      <div className={styles.row}>
        <span className={styles.label}>Действие:</span>
        <span className={actionClass}>
          {ACTION_LABELS[human.currentAction] ?? human.currentAction}
        </span>
      </div>

      <div>
        <div className={styles.row}>
          <span className={styles.label}>Голод</span>
          <span className={styles.value}>{hunger}%</span>
        </div>
        <div className={styles.barTrack}>
          <div className={`${styles.barFill} ${styles.hungerFill}`} style={{ width: `${hunger}%` }} />
        </div>
      </div>

      <div>
        <div className={styles.row}>
          <span className={styles.label}>Энергия</span>
          <span className={styles.value}>{energy}%</span>
        </div>
        <div className={styles.barTrack}>
          <div className={`${styles.barFill} ${styles.energyFill}`} style={{ width: `${energy}%` }} />
        </div>
      </div>

      <div>
        <div className={styles.row}>
          <span className={styles.label}>Здоровье</span>
          <span className={styles.value}>{health}%</span>
        </div>
        <div className={styles.barTrack}>
          <div className={`${styles.barFill} ${styles.healthFill}`} style={{ width: `${health}%` }} />
        </div>
      </div>

      <div>
        <div className={styles.row}>
          <span className={styles.label}>Настроение</span>
          <span className={styles.value}>{mood}%</span>
        </div>
        <div className={styles.barTrack}>
          <div className={`${styles.barFill} ${styles.moodFill}`} style={{ width: `${mood}%` }} />
        </div>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>Координаты:</span>
        <span className={styles.value}>X: {human.x} &nbsp; Y: {human.y}</span>
      </div>
    </div>
  );
}

function CitySection({
  city,
  cityTrades,
  cityEvents,
  relationshipEntries,
}: {
  city: City;
  cityTrades: TradeLink[];
  cityEvents: Event[];
  relationshipEntries: { id: string; name: string; rel: string }[];
}) {
  return (
    <div className={styles.section}>
      <span className={styles.cityName}>{city.name}</span>
      <div className={styles.metaRow}>
        <span>X: {city.x} &nbsp; Y: {city.y}</span>
      </div>
      <div className={styles.metaRow}>
        <span>Население: {city.humanIds.length}</span>
      </div>
      <div className={styles.metaRow}>
        <span>Еда: {city.food}</span>
      </div>
      <div className={styles.metaRow}>
        <span>Золото: {city.gold}</span>
      </div>
      <div className={styles.metaRow}>
        <span>
          Статус:{' '}
          <span style={{ color: city.status.color }}>
            {STATUS_LABELS[city.status.state] || city.status.state}
          </span>
        </span>
      </div>

      {(city.goldenAgeDays > 0 || city.darkAgeDays > 0 || city.epidemicDays > 0) && (
        <span className={styles.subHeader}>Активные состояния:</span>
      )}
      {city.goldenAgeDays > 0 && (
        <span className={styles.timerGolden}>✨ Золотой век: {city.goldenAgeDays} дн.</span>
      )}
      {city.darkAgeDays > 0 && (
        <span className={styles.timerDark}>💀 Тёмные времена: {city.darkAgeDays} дн.</span>
      )}
      {city.epidemicDays > 0 && (
        <span className={styles.timerEpidemic}>🦠 Эпидемия: {city.epidemicDays} дн.</span>
      )}

      {city.traits.length > 0 && <span className={styles.subHeader}>Черты:</span>}
      {city.traits.map((trait) => (
        <span key={trait} className={styles.traitEntry}>
          {TRAIT_LABELS[trait] || trait}
        </span>
      ))}

      {relationshipEntries.length > 0 && <span className={styles.subHeader}>Отношения:</span>}
      {relationshipEntries.map(({ id, name, rel }) => (
        <span key={id} className={styles.relationEntry}>
          {rel === 'ally' ? '🤝' : '⚔️'} {name}
        </span>
      ))}

      {cityTrades.length > 0 && <span className={styles.subHeader}>Торговые маршруты:</span>}
      {cityTrades.map((t, i) => (
        <span key={i} className={styles.tradeEntry}>
          {t.sellerId === city.id
            ? `→ продаёт ${t.food} еды за ${t.gold} золота`
            : `← покупает ${t.food} еды за ${t.gold} золота`}
        </span>
      ))}

      {cityEvents.length > 0 && <span className={styles.subHeader}>Последние события:</span>}
      {cityEvents.map((e) => (
        <span key={e.id} className={styles.historyEntry}>
          Day {e.day}: {e.message}
        </span>
      ))}
    </div>
  );
}

function PoiSection({ poi }: { poi: Poi }) {
  const kindLabel =
    poi.kind === 'ruins' ? '💀 Руины' : poi.kind === 'bandit_camp' ? '⚔ Лагерь разбойников' : '🕳 Пещера';

  return (
    <div className={styles.section}>
      <span className={styles.cityName} style={{ color: '#9ca3af' }}>
        {kindLabel}
      </span>
      {poi.formerCityName && (
        <div className={styles.metaRow}>
          <span style={{ color: '#9ca3af' }}>Бывший город: {poi.formerCityName}</span>
        </div>
      )}
      <div className={styles.metaRow}>
        <span>X: {poi.x} &nbsp; Y: {poi.y}</span>
      </div>
      {poi.createdDay > 0 && (
        <div className={styles.metaRow}>
          <span>День появления: {poi.createdDay}</span>
        </div>
      )}
      {poi.kind === 'ruins' && (
        <div className={styles.metaRow}>
          <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Этот город был заброшен</span>
        </div>
      )}
    </div>
  );
}

function TileSection({ tile }: { tile: Tile }) {
  return (
    <div className={styles.section}>
      <div className={styles.metaRow}>Тип: {tile.type}</div>
      <div className={styles.metaRow}>X: {tile.x}</div>
      <div className={styles.metaRow}>Y: {tile.y}</div>
    </div>
  );
}
