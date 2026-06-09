import { useState } from "react";
import styles from "./EventLog.module.css"
import { Event } from "@/app/types/tiles";

interface EventLogsProps {
    eventLog: Event[]
}

export function EventLog({eventLog}:EventLogsProps) {
    const [isOpen, setIsOpen] = useState<boolean>(false)

    return (
        <div>
            <button className={styles.button} onClick={() => setIsOpen(true)}>Event Log</button>
            {isOpen && <div className={styles.overlay} onClick={() => setIsOpen(false)}>

                <div className={styles.eventLog} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.closeButton} onClick={() => setIsOpen(false)}>X</div>
                    <div className={styles.eventList}>
                        {eventLog.map(event => (
                            <div key={event.id} className={styles.eventItem}>
                                <span className={styles.day}>Day {event.day}:</span> <span className={styles.message}>{event.message}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>}
        </div>
    )
}