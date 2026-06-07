'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TileMap } from '@/app/types/tiles';
import styles from './MapRenderer.module.css';

interface MapRendererProps {
  map: TileMap;
  tileSize?: number;
}

interface Camera {
  x: number;
  y: number;
  scale: number;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 4;
const KEYBOARD_PAN_DISTANCE = 48;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const getAxisBounds = (viewportSize: number, contentSize: number) => {
  if (contentSize <= viewportSize) {
    const centeredOffset = (viewportSize - contentSize) / 2;
    return { min: centeredOffset, max: centeredOffset };
  }

  return { min: viewportSize - contentSize, max: 0 };
};

export function MapRenderer({ map, tileSize = 16 }: MapRendererProps) {
  const mapHeight = map?.length ?? 0;
  const mapWidth = map?.[0]?.length ?? 0;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, scale: 1 });
  const draggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const constrainCamera = useCallback((nextCamera: Camera) => {
    const viewport = containerRef.current;
    const mapElement = mapRef.current;

    if (!viewport || !mapElement) {
      return nextCamera;
    }

    const scale = clamp(nextCamera.scale, MIN_SCALE, MAX_SCALE);
    const contentWidth = mapElement.offsetWidth * scale;
    const contentHeight = mapElement.offsetHeight * scale;
    const xBounds = getAxisBounds(viewport.clientWidth, contentWidth);
    const yBounds = getAxisBounds(viewport.clientHeight, contentHeight);

    return {
      scale,
      x: clamp(nextCamera.x, xBounds.min, xBounds.max),
      y: clamp(nextCamera.y, yBounds.min, yBounds.max),
    };
  }, []);

  const centerView = useCallback(() => {
    const viewport = containerRef.current;
    const mapElement = mapRef.current;

    if (!viewport || !mapElement) {
      return;
    }

    setCamera(
      constrainCamera({
        scale: 1,
        x: (viewport.clientWidth - mapElement.offsetWidth) / 2,
        y: (viewport.clientHeight - mapElement.offsetHeight) / 2,
      }),
    );
  }, [constrainCamera]);

  useEffect(() => {
    centerView();
  }, [centerView, mapHeight, mapWidth, tileSize]);

  useEffect(() => {
    const viewport = containerRef.current;
    const mapElement = mapRef.current;

    if (!viewport || !mapElement) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      setCamera((currentCamera) => constrainCamera(currentCamera));
    });

    resizeObserver.observe(viewport);
    resizeObserver.observe(mapElement);

    return () => resizeObserver.disconnect();
  }, [constrainCamera]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = containerRef.current;
    if (!el) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    el.focus();
    el.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    setCamera((currentCamera) =>
      constrainCamera({
        ...currentCamera,
        x: currentCamera.x + dx,
        y: currentCamera.y + dy,
      }),
    );
  }, [constrainCamera]);

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
    setCamera((currentCamera) => {
      const newScale = clamp(currentCamera.scale * zoomFactor, MIN_SCALE, MAX_SCALE);
      const xRel = (cx - currentCamera.x) / currentCamera.scale;
      const yRel = (cy - currentCamera.y) / currentCamera.scale;

      return constrainCamera({
        scale: newScale,
        x: cx - xRel * newScale,
        y: cy - yRel * newScale,
      });
    });
  }, [constrainCamera]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === '0' || e.key === 'Home') {
      e.preventDefault();
      centerView();
      return;
    }

    const key = e.key.toLowerCase();
    const updateCamera = (currentCamera: Camera): Camera | null => {
      switch (key) {
        case 'arrowup':
        case 'w':
          return { ...currentCamera, y: currentCamera.y + KEYBOARD_PAN_DISTANCE };
        case 'arrowdown':
        case 's':
          return { ...currentCamera, y: currentCamera.y - KEYBOARD_PAN_DISTANCE };
        case 'arrowleft':
        case 'a':
          return { ...currentCamera, x: currentCamera.x + KEYBOARD_PAN_DISTANCE };
        case 'arrowright':
        case 'd':
          return { ...currentCamera, x: currentCamera.x - KEYBOARD_PAN_DISTANCE };
        case '+':
        case '=':
          return { ...currentCamera, scale: currentCamera.scale * 1.15 };
        case '-':
        case '_':
          return { ...currentCamera, scale: currentCamera.scale / 1.15 };
        default:
          return null;
      }
    };

    const handledKeys = [
      'arrowup',
      'w',
      'arrowdown',
      's',
      'arrowleft',
      'a',
      'arrowright',
      'd',
      '+',
      '=',
      '-',
      '_',
    ];

    if (!handledKeys.includes(key)) {
      return;
    }

    e.preventDefault();
    setCamera((currentCamera) => constrainCamera(updateCamera(currentCamera) ?? currentCamera));
  }, [centerView, constrainCamera]);

  if (!map || mapHeight === 0 || mapWidth === 0) {
    return <div>No map data</div>;
  }

  return (
    <div
      className={styles.viewport}
      ref={containerRef}
      role="application"
      aria-label="Simple Colony Sim map camera"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onWheel={onWheel}
      onDoubleClick={centerView}
      onKeyDown={onKeyDown}
    >
      <div
        className={styles.content}
        style={{
          transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})`,
        }}
      >
        <div
          ref={mapRef}
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
