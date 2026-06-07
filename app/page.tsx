import { MapRenderer } from '@/app/components/MapRenderer';
import { generateMap } from '@/app/utils/mapGenerator';

export default function Home() {
  const map = generateMap(42);

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full flex-col items-center justify-start py-16 px-8 bg-white dark:bg-black gap-8">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-4xl font-bold text-black dark:text-zinc-50">
            Simple Colony Sim
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Explore a 50x50 colony map with water and grass tiles
          </p>
        </div>
        <div className="flex justify-center w-full overflow-auto">
          <MapRenderer map={map} tileSize={16} />
        </div>
      </main>
    </div>
  );
}
