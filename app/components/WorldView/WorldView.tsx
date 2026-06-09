'use client';

import { MapRenderer } from '@/app/components/MapRenderer/MapRenderer';
import { generateMap } from '@/app/lib/mapGenerator';
import { TileInspector } from '@/app/components/TileInspector/TileInspector';
import { DayCounter } from '../DayCounter/DayCounter';
import { useEffect, useState } from 'react';
import { Tile, City, World, Event } from '@/app/types/tiles';
import { updateWorldForNewDay } from '@/app/lib/simulation';
import { EventLog } from '../EventLog/EventLog';
import { DAY_TICK_MS, DEFAULT_MAP_SEED, EVENT_INTERVAL_DAYS, MAX_EVENT_LOG_SIZE } from '@/app/config';

export function WorldView() {
  const [world, setWorld] = useState<World>(generateMap(DEFAULT_MAP_SEED))
  const [day, setDay] = useState(1)
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null)
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null)
  const [eventLog, setEventLog] = useState<Event[]>([])
  const selectedCity = world.cities.find((cities) => cities.id === selectedCityId) ?? null

  useEffect(() => {
    const id = setInterval(() => {
      setDay((prevDay) => {
        const newDay = prevDay + 1
        if (newDay % EVENT_INTERVAL_DAYS === 0) {
          setEventLog((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              day: newDay,
              message: `passed ${EVENT_INTERVAL_DAYS} days`,
            },
          ])
          // Keep only the last MAX_EVENT_LOG_SIZE events
          setEventLog((prev) => prev.slice(-MAX_EVENT_LOG_SIZE))
        }
        return newDay
      })
      setWorld((prevWorld) => updateWorldForNewDay(prevWorld))
    }, DAY_TICK_MS)

    return () => clearInterval(id)
  }, [])

  return (
    <div className="h-screen w-screen overflow-hidden bg-black font-sans">
      <main className="h-full w-full">
        <MapRenderer world={world} tileSize={16} setSelectedCityId={setSelectedCityId} setSelectedTile={setSelectedTile} />
        <DayCounter day={day} />
        <TileInspector selectedTile={selectedTile} selectedCity={selectedCity} />
        <EventLog eventLog={eventLog} />
      </main>
    </div>
  )
}
