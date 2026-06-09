'use client';

import { MapRenderer } from '@/app/components/MapRenderer/MapRenderer';
import { generateMap } from '@/app/lib/mapGenerator';
import { TileInspector } from '@/app/components/TileInspector/TileInspector';
import { DayCounter } from '../DayCounter/DayCounter';
import { useEffect, useState } from 'react';
import { Tile, City, World, Event } from '@/app/types/tiles';
import { updateWorldForNewDay } from '@/app/lib/simulation';
import { EventLog } from '../EventLog/EventLog';

const DAY_TICK_MS = 1000;

export function WorldView() {
  const [world, setWorld] = useState<World>(generateMap(42))
  const [day, setDay] = useState(1)
  const [selectedCityId, setSelectedCityId] = useState<string |null>(null);
  const [selectedTile, setSelectedTile] = useState<Tile|null>(null);
  const eventLog : Event[] = []
  const selectedCity = world.cities.find((cities) => cities.id === selectedCityId) ?? null;
  useEffect(() => {
    const id = setInterval(() => {
      setDay(d => d + 1)
      setWorld(world => updateWorldForNewDay(world))
      if (day % 10 === 0) {
        eventLog.push({
          id: crypto.randomUUID(),
          day,
          message: "passed 10 days"
        })
      }
    }, DAY_TICK_MS)

    return () => clearInterval(id)
  }, [])
  
  return (
    <div className="h-screen w-screen overflow-hidden bg-black font-sans">
      <main className="h-full w-full">
        <MapRenderer world={world} tileSize={16} setSelectedCityId={setSelectedCityId} setSelectedTile={setSelectedTile}/>
        <DayCounter day={day}/>
        <TileInspector selectedTile={selectedTile} selectedCity={selectedCity}/>
        <EventLog />
      </main>
    </div>
  );
}
