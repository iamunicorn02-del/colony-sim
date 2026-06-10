'use client';

import { MapRenderer } from '@/app/components/MapRenderer/MapRenderer';
import { TileInspector } from '@/app/components/TileInspector/TileInspector';
import { DayCounter } from '../DayCounter/DayCounter';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Tile, City, World, Event } from '@/app/types/tiles';
import { EventLog } from '../EventLog/EventLog';
import { createWorldSocket } from '@/app/lib/worldSocket';

export function WorldView() {
  const [world, setWorld] = useState<World | null>(null);
  const [day, setDay] = useState(0);
  const [eventLog, setEventLog] = useState<Event[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<ReturnType<typeof createWorldSocket> | null>(null);
  const worldIdRef = useRef<string | null>(null);

  const selectedCity = world?.cities.find((c) => c.id === selectedCityId) ?? null;

  useEffect(() => {
    // Prevent double-init in Strict Mode
    if (worldIdRef.current) return;

    let destroyed = false;
    let unsub: (() => void) | undefined;

    fetch('/api/world', { method: 'POST' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to create world');
        return res.json();
      })
      .then((data) => {
        if (destroyed) return;
        const id: string = data.worldId;
        worldIdRef.current = id;

        const socket = createWorldSocket();
        socketRef.current = socket;

        unsub = socket.onMessage((msg) => {
          switch (msg.type) {
            case 'worldState':
              setWorld(msg.world as World);
              setDay(msg.day);
              setEventLog(msg.eventLog as Event[]);
              setLoading(false);
              break;
            case 'event':
              setEventLog((prev) =>
                [...prev, { id: crypto.randomUUID(), day: msg.day, message: msg.message }].slice(-50)
              );
              break;
            case 'error':
              setError(msg.message);
              break;
          }
        });

        socket.connect(id);
      })
      .catch((err: Error) => {
        if (!destroyed) {
          setError(err.message ?? 'Failed to initialize world');
          setLoading(false);
        }
      });

    return () => {
      destroyed = true;
      unsub?.();
      socketRef.current?.disconnect();
      socketRef.current = null;
      worldIdRef.current = null;
    };
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="text-xl mb-2">Generating world...</div>
          <div className="text-sm text-gray-400">Connecting to server</div>
        </div>
      </div>
    );
  }

  if (error || !world) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="text-xl text-red-400 mb-2">Error</div>
          <div className="text-sm text-gray-400">{error ?? 'World not available'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-black font-sans">
      <main className="h-full w-full">
        <MapRenderer world={world} tileSize={16} setSelectedCityId={setSelectedCityId} setSelectedTile={setSelectedTile} />
        <DayCounter day={day} />
        <TileInspector selectedTile={selectedTile} selectedCity={selectedCity} />
        <EventLog eventLog={eventLog} />
      </main>
    </div>
  );
}
