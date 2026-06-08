import { MapRenderer } from '@/app/components/MapRenderer';
import { generateMap } from '@/app/utils/mapGenerator';

export default function Home() {
  const map = generateMap(42);

  return (
    <div className="h-screen w-screen overflow-hidden bg-black font-sans">
      <main className="h-full w-full">
        <MapRenderer map={map} tileSize={16} />
      </main>
    </div>
  );
}
