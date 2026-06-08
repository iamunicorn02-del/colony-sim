import { useState } from "react";
import { Tile, TileType, City } from '@/app/types/tiles';
import styles from './TileInspector.module.css';

interface TileInspectorProps {
    selectedTile: Tile | null
    selectedCity: City | null
}

export function TileInspector({selectedTile, selectedCity}:TileInspectorProps) {

    return (
    <aside className={styles.inspector} aria-live="polite">
            <span className={styles.inspectorTitle}>
            {selectedCity ? 'City inspector' : 'Tile inspector'}
            </span>
            {selectedCity ? (
            <>
                <span>Name: {selectedCity.name}</span>
                <span>X: {selectedCity.x}</span>
                <span>Y: {selectedCity.y}</span>
                <span>Population: {selectedCity.population}</span>
            </>
            ) : selectedTile ? (
            <>
                <span>Type: {selectedTile.type}</span>
                <span>X: {selectedTile.x}</span>
                <span>Y: {selectedTile.y}</span>
            </>
            ) : (
            <span>No tile selected</span>
            )}
        </aside>
    )
}