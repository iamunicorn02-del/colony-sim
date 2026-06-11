import { useEffect, useRef, useState, useCallback } from "react";
import styles from "./EventLog.module.css";
import { Event, EventKind } from "@/app/types/tiles";

interface EventLogsProps {
    eventLog: Event[]
}

const SCROLL_THRESHOLD = 50;

function isAtBottom(el: HTMLElement): boolean {
    return el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD;
}

const EVENT_KIND_COLOR: Record<EventKind, string> = {
    harvest: '#22c55e',
    plague: '#dc2626',
    golden_age: '#eab308',
    dark_age: '#6b7280',
    drought: '#f97316',
    flood: '#3b82f6',
    conflict: '#ef4444',
    alliance: '#a855f7',
    colony: '#14b8a6',
    epidemic: '#b91c1c',
    caravan: '#8b5cf6',
    fortune: '#fbbf24',
    misfortune: '#78716c',
};

export function EventLog({ eventLog }: EventLogsProps) {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [filter, setFilter] = useState<EventKind | 'all'>('all');
    const listRef = useRef<HTMLDivElement>(null);
    const isAtBottomRef = useRef(true);
    const isScrollingRef = useRef(false);
    const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const el = listRef.current;
        if (!el || !isOpen) return;

        if (isAtBottomRef.current) {
            isScrollingRef.current = true;
            requestAnimationFrame(() => {
                el.scrollTop = el.scrollHeight;
                requestAnimationFrame(() => {
                    isScrollingRef.current = false;
                });
            });
        }
    }, [eventLog, isOpen]);

    const handleScroll = useCallback(() => {
        if (isScrollingRef.current) return;
        const el = listRef.current;
        if (!el) return;
        if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = setTimeout(() => {
            isAtBottomRef.current = isAtBottom(el);
        }, 100);
    }, []);

    useEffect(() => {
        return () => {
            if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
        };
    }, []);

    const filteredLog = filter === 'all'
        ? eventLog
        : eventLog.filter((e) => e.kind === filter);

    const kinds = Array.from(new Set(eventLog.map((e) => e.kind).filter(Boolean)));

    return (
        <div>
            <button className={styles.button} onClick={() => setIsOpen(true)}>Event Log</button>
            {isOpen && (
                <div className={styles.overlay} onClick={() => setIsOpen(false)}>
                    <div className={styles.eventLog} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.closeButton} onClick={() => setIsOpen(false)}>X</div>

                        {/* Filter chips */}
                        <div className={styles.filterRow}>
                            <button
                                className={`${styles.filterChip} ${filter === 'all' ? styles.filterChipActive : ''}`}
                                onClick={() => setFilter('all')}
                            >
                                All
                            </button>
                            {kinds.map((k) => (
                                <button
                                    key={k}
                                    className={`${styles.filterChip} ${filter === k ? styles.filterChipActive : ''}`}
                                    style={{ borderColor: EVENT_KIND_COLOR[k] }}
                                    onClick={() => setFilter(k)}
                                >
                                    {k.replace(/_/g, ' ')}
                                </button>
                            ))}
                        </div>

                        <div className={styles.eventList} ref={listRef} onScroll={handleScroll}>
                            {filteredLog.length === 0 && (
                                <div className={styles.empty}>No events yet</div>
                            )}
                            {filteredLog.map((event) => {
                                const color = event.kind ? (EVENT_KIND_COLOR[event.kind] || '#eee') : '#888';
                                return (
                                    <div key={event.id} className={styles.eventItem}>
                                        <span className={styles.kindDot} style={{ background: color }} />
                                        <span className={styles.day}>Day {event.day}:</span>
                                        <span className={styles.message}>{event.message}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
