import { useState } from "react";
import { City } from "@/app/types/tiles";
import styles from "./CityRanking.module.css";

interface CityRankingProps {
  cities: City[];
}

export function CityRanking({ cities }: CityRankingProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const sortedCities = [...cities].sort((a, b) => b.gold - a.gold);

  return (
    <div>
      <button
        className={styles.button}
        onClick={() => setIsOpen(true)}
      >
        City Ranking
      </button>
      {isOpen && (
        <div className={styles.overlay} onClick={() => setIsOpen(false)}>
          <div
            className={styles.panel}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={styles.closeButton}
              onClick={() => setIsOpen(false)}
            >
              X
            </div>
            <div className={styles.title}>City Ranking</div>
            <div className={styles.list}>
              {sortedCities.map((city, index) => (
                <div key={city.id} className={styles.row}>
                  <span className={styles.rank}>#{index + 1}</span>
                  <span className={styles.name}>{city.name}</span>
                  <span className={styles.gold}>{city.gold} gold</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
