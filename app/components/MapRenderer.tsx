'use client';

import React, { useRef, useState, useCallback } from 'react';
import { TileType, TileMap } from '@/app/types/tiles';
import styles from './MapRenderer.module.css';

interface MapRendererProps {
  map: TileMap;
  tileSize?: number;
}

export function MapRenderer({ map, tileSize = 16 }: MapRendererProps) {
  if (!map || map.length === 0) {
    return <div>No map data</div>;
  }

  const mapHeight = map.length;
  const mapWidth = map[0].length;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = containerRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    setOffset(o => ({ x: o.x + dx, y: o.y + dy }));
  }, []);

  const endDrag = useCallback((e: React.PointerEvent) => {
    const el = containerRef.current;
    if (!el) return;
    try { el.releasePointerCapture(e.pointerId); } catch {}
    draggingRef.current = false;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const zoomFactor = Math.exp(-e.deltaY * 0.0015);
    const newScale = clamp(scale * zoomFactor, 0.2, 4);

    // coordinates relative to content before scale
    const xRel = (cx - offset.x) / scale;
    const yRel = (cy - offset.y) / scale;

    const newOffsetX = cx - xRel * newScale;
    const newOffsetY = cy - yRel * newScale;

    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
  }, [scale, offset]);

  const resetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  return (
    <div className={styles.viewport} ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onWheel={onWheel}
      onDoubleClick={resetView}
    >
      <div className={styles.content}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
      >
        <div
          className={styles.mapContainer}
          style={{
            '--grid-cols': mapWidth,
            '--tile-size': `${tileSize}px`,
          } as React.CSSProperties & { '--grid-cols': number; '--tile-size': string }}
        >
          {map.map((row, y) =>
            row.map((tile, x) => (
              <div
                key={`${x}-${y}`}
                className={`${styles.tile} ${styles[tile.type]}`}
                title={`${tile.type} at (${x}, ${y})`}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
