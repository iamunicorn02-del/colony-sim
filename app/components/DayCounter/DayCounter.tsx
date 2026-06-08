import styles from "./DayCounter.module.css"

interface DayCounterProps {
    day: number
}

export function DayCounter({day}:DayCounterProps) {
    return (
    <div className={styles.dayHud} aria-live="polite">
        Day {day}
    </div>
    )
}