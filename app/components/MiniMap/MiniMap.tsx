import { useEffect, useRef } from 'react';
import { World } from '@/app/types/tiles';
import { TILE_COLORS } from '@/app/config';
import styles from './MiniMap.module.css';

interface MiniMapProps {
  world: World;
  selectedCityId: string | null;
  onSelectCity: (cityId: string | null) => void;
}

export function MiniMap({ world, selectedCityId, onSelectCity }: MiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mapW = world.map[0]?.length ?? 0;
    const mapH = world.map.length;
    if (mapW === 0 || mapH === 0) return;

    // Fixed minimap size
    const mmW = 160;
    const mmH = 160;
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = mmW * pixelRatio;
    canvas.height = mmH * pixelRatio;
    canvas.style.width = `${mmW}px`;
    canvas.style.height = `${mmH}px`;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    // Draw terrain (1px per tile, scaled down)
    const tileW = mmW / mapW;
    const tileH = mmH / mapH;

    for (let y = 0; y < mapH; y++) {
      for (let x = 0; x < mapW; x++) {
        ctx.fillStyle = TILE_COLORS[world.map[y][x].type];
        ctx.fillRect(x * tileW, y * tileH, tileW + 0.5, tileH + 0.5);
      }
    }

    // Draw cities as dots
    for (const city of world.cities) {
      const cx = (city.x + 0.5) * tileW;
      const cy = (city.y + 0.5) * tileH;
      const r = city.id === selectedCityId ? 3 : 2;

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = city.id === selectedCityId ? '#ffffff' : (city.status.color || '#facc15');
      ctx.fill();

      if (city.id === selectedCityId) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }, [world, selectedCityId]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const mapW = world.map[0]?.length ?? 0;
    const mapH = world.map.length;
    const tileW = 160 / mapW;
    const tileH = 160 / mapH;

    // Find closest city within a few pixels
    let closest: string | null = null;
    let closestDist = Infinity;
    for (const city of world.cities) {
      const cx = (city.x + 0.5) * tileW;
      const cy = (city.y + 0.5) * tileH;
      const dist = Math.hypot(mx - cx, my - cy);
      if (dist < 6 && dist < closestDist) {
        closest = city.id;
        closestDist = dist;
      }
    }
    onSelectCity(closest);
  };

  return (
    <div className={styles.miniMap}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onClick={handleClick}
        title="Миникарта — кликните на город"
      />
    </div>
  );
}
