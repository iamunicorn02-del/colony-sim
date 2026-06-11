'use client';

import { MapRenderer } from '@/app/components/MapRenderer/MapRenderer';
import { TileInspector } from '@/app/components/TileInspector/TileInspector';
import { DayCounter } from '../DayCounter/DayCounter';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Tile, World, Event, EventKind, Human } from '@/app/types/tiles';
import { EventLog } from '../EventLog/EventLog';
import { CityRanking } from '@/app/components/CityRanking/CityRanking';
import { MiniMap } from '@/app/components/MiniMap/MiniMap';
import { createWorldSocket, type TradeLink } from '@/app/lib/worldSocket';

const WORLD_ID_KEY = 'colony-sim:worldId';

export function WorldView() {
  const [world, setWorld] = useState<World | null>(null);
  const [humans, setHumans] = useState<Record<string, Human>>({});
  const [day, setDay] = useState(0);
  const [eventLog, setEventLog] = useState<Event[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [tradeLinks, setTradeLinks] = useState<TradeLink[]>([]);
  const [dailyStory, setDailyStory] = useState<string | null>(null);
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

    // Reuse the persisted world if it still exists on the server,
    // otherwise create a fresh one.
    const resolveWorldId = async (): Promise<string> => {
      const savedId =
        typeof window !== 'undefined' ? window.localStorage.getItem(WORLD_ID_KEY) : null;

      if (savedId) {
        try {
          const res = await fetch(`/api/world/${savedId}`);
          if (res.ok) {
            return savedId;
          }
        } catch {
          // fall through to creating a new world
        }
      }

      const res = await fetch('/api/world', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create world');
      const data = await res.json();
      const id: string = data.worldId;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(WORLD_ID_KEY, id);
      }
      return id;
    };

    resolveWorldId()
      .then((id) => {
        if (destroyed) return;
        worldIdRef.current = id;

        const socket = createWorldSocket();
        socketRef.current = socket;

        unsub = socket.onMessage((msg) => {
          switch (msg.type) {
            case 'worldState':
              setWorld(msg.world as World);
              setHumans((msg.world as World).humans);
              setDay(msg.day);
              setEventLog(msg.eventLog as Event[]);
              setDailyStory(msg.dailyStory ?? null);
              setTradeLinks(msg.tradeLinks ?? []);
              setLoading(false);
              break;
            case 'event':
              setEventLog((prev) =>
                [...prev, { id: crypto.randomUUID(), day: msg.day, message: msg.message, kind: (msg.kind as EventKind) ?? 'minor' }].slice(-50)
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
        <MapRenderer world={world} humans={humans} tileSize={16} tradeLinks={tradeLinks} setSelectedCityId={setSelectedCityId} setSelectedTile={setSelectedTile} />
        <DayCounter day={day} />
        {dailyStory && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-sm bg-black/60 text-white border border-white/10 pointer-events-none animate-pulse">
            <span className="text-amber-400 mr-2">📜</span>{dailyStory}
          </div>
        )}
        <TileInspector selectedTile={selectedTile} selectedCity={selectedCity} tradeLinks={tradeLinks} eventLog={eventLog} worldCities={world?.cities ?? []} />
        <EventLog eventLog={eventLog} />
        <CityRanking cities={world.cities} />
        <MiniMap world={world} selectedCityId={selectedCityId} onSelectCity={setSelectedCityId} />
      </main>
    </div>
  );
}
