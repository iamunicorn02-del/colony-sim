'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Tile, TileMap, TileType } from '@/app/types/tiles';
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
const DAY_TICK_MS = 1000;
const KEYBOARD_PAN_DISTANCE = 48;
const DRAG_CLICK_THRESHOLD = 4;
const TILE_COLORS: Record<TileType, string> = {
  [TileType.GRASS]: '#4a9d6f',
  [TileType.WATER]: '#2563eb',
};

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
  const mapPixelWidth = mapWidth * tileSize;
  const mapPixelHeight = mapHeight * tileSize;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [day, setDay] = useState(1);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, scale: 1 });
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const draggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const pointerDownRef = useRef({ x: 0, y: 0 });

  const constrainCamera = useCallback((nextCamera: Camera) => {
    const viewport = containerRef.current;

    if (!viewport) {
      return nextCamera;
    }

    const scale = clamp(nextCamera.scale, MIN_SCALE, MAX_SCALE);
    const contentWidth = mapPixelWidth * scale;
    const contentHeight = mapPixelHeight * scale;
    const xBounds = getAxisBounds(viewport.clientWidth, contentWidth);
    const yBounds = getAxisBounds(viewport.clientHeight, contentHeight);

    return {
      scale,
      x: clamp(nextCamera.x, xBounds.min, xBounds.max),
      y: clamp(nextCamera.y, yBounds.min, yBounds.max),
    };
  }, [mapPixelHeight, mapPixelWidth]);

  const centerView = useCallback(() => {
    const viewport = containerRef.current;

    if (!viewport) {
      return;
    }

    setCamera(
      constrainCamera({
        scale: 1,
        x: (viewport.clientWidth - mapPixelWidth) / 2,
        y: (viewport.clientHeight - mapPixelHeight) / 2,
      }),
    );
  }, [constrainCamera, mapPixelHeight, mapPixelWidth]);

  useEffect(() => {
    centerView();
  }, [centerView, mapHeight, mapWidth, tileSize]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setDay((currentDay) => currentDay + 1);
    }, DAY_TICK_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || !map || mapHeight === 0 || mapWidth === 0) {
      return;
    }

    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.round(mapPixelWidth * pixelRatio);
    canvas.height = Math.round(mapPixelHeight * pixelRatio);
    canvas.style.width = `${mapPixelWidth}px`;
    canvas.style.height = `${mapPixelHeight}px`;

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, mapPixelWidth, mapPixelHeight);

    for (const row of map) {
      for (const tile of row) {
        context.fillStyle = TILE_COLORS[tile.type];
        context.fillRect(tile.x * tileSize, tile.y * tileSize, tileSize, tileSize);
      }
    }

    context.strokeStyle = 'rgba(23, 23, 23, 0.22)';
    context.lineWidth = 1;

    for (let x = 0; x <= mapWidth; x++) {
      const position = x * tileSize + 0.5;
      context.beginPath();
      context.moveTo(position, 0);
      context.lineTo(position, mapPixelHeight);
      context.stroke();
    }

    for (let y = 0; y <= mapHeight; y++) {
      const position = y * tileSize + 0.5;
      context.beginPath();
      context.moveTo(0, position);
      context.lineTo(mapPixelWidth, position);
      context.stroke();
    }
  }, [map, mapHeight, mapPixelHeight, mapPixelWidth, mapWidth, tileSize]);

  useEffect(() => {
    const viewport = containerRef.current;

    if (!viewport) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      setCamera((currentCamera) => constrainCamera(currentCamera));
    });

    resizeObserver.observe(viewport);

    return () => resizeObserver.disconnect();
  }, [constrainCamera]);

  const getTileFromPointer = useCallback((clientX: number, clientY: number) => {
    const viewport = containerRef.current;

    if (!viewport || !map) {
      return null;
    }

    const rect = viewport.getBoundingClientRect();
    const contentX = (clientX - rect.left - camera.x) / camera.scale;
    const contentY = (clientY - rect.top - camera.y) / camera.scale;
    const tileX = Math.floor(contentX / tileSize);
    const tileY = Math.floor(contentY / tileSize);

    if (tileX < 0 || tileY < 0 || tileX >= mapWidth || tileY >= mapHeight) {
      return null;
    }

    return map[tileY][tileX];
  }, [camera.scale, camera.x, camera.y, map, mapHeight, mapWidth, tileSize]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = containerRef.current;
    if (!el) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    el.focus();
    el.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    pointerDownRef.current = { x: e.clientX, y: e.clientY };
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

    const dragDistance = Math.hypot(
      e.clientX - pointerDownRef.current.x,
      e.clientY - pointerDownRef.current.y,
    );

    if (dragDistance <= DRAG_CLICK_THRESHOLD) {
      setSelectedTile(getTileFromPointer(e.clientX, e.clientY));
    }
  }, [getTileFromPointer]);

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
      onDragStart={(e) => e.preventDefault()}
    >
      <div
        className={styles.content}
        style={{
          transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})`,
        }}
      >
        <canvas
          ref={canvasRef}
          className={styles.mapCanvas}
          draggable={false}
        />
      </div>
      <div className={styles.dayHud} aria-live="polite">
        Day {day}
      </div>
      <aside className={styles.inspector} aria-live="polite">
        <span className={styles.inspectorTitle}>Tile inspector</span>
        {selectedTile ? (
          <>
            <span>Type: {selectedTile.type}</span>
            <span>X: {selectedTile.x}</span>
            <span>Y: {selectedTile.y}</span>
          </>
        ) : (
          <span>No tile selected</span>
        )}
      </aside>
    </div>
  );
}
