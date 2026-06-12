import { Human } from '@/app/types/tiles';
import styles from './HumanCard.module.css';

const ACTION_LABELS: Record<string, string> = {
  idle: 'Отдыхает',
  moving: 'Двигается',
  eating: 'Ест',
  resting: 'Отдыхает',
};

interface HumanCardProps {
  human: Human;
  onClose?: () => void;
}

function HumanCard({ human, onClose }: HumanCardProps) {
  if (!human) return null;

  const actionClass = styles[`action_${human.currentAction}`] ?? styles.action_idle;
  const hunger = Math.min(100, Math.max(0, human.hunger));
  const energy = Math.min(100, Math.max(0, human.energy));

  return (
    <aside className={styles.card} aria-live="polite">
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>Human</span>
        {onClose && (
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ✕
          </button>
        )}
      </div>

      <span className={styles.name}>{human.name}</span>

      <div className={styles.row}>
        <span className={styles.label}>Действие:</span>
        <span className={actionClass}>{ACTION_LABELS[human.currentAction] ?? human.currentAction}</span>
      </div>

      <div>
        <div className={styles.row}>
          <span className={styles.label}>Голод</span>
          <span className={styles.value}>{hunger}%</span>
        </div>
        <div className={styles.barTrack}>
          <div
            className={`${styles.barFill} ${styles.hungerFill}`}
            style={{ width: `${hunger}%` }}
          />
        </div>
      </div>

      <div>
        <div className={styles.row}>
          <span className={styles.label}>Энергия</span>
          <span className={styles.value}>{energy}%</span>
        </div>
        <div className={styles.barTrack}>
          <div
            className={`${styles.barFill} ${styles.energyFill}`}
            style={{ width: `${energy}%` }}
          />
        </div>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>Координаты:</span>
        <span className={styles.value}>X: {human.x} &nbsp; Y: {human.y}</span>
      </div>
    </aside>
  );
}

export default HumanCard;
