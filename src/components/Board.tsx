import React, { useState } from 'react';
import styles from './Board.module.css';
import { Stone, StoneProps } from './Stone';

// Standard 19x19 star points (hoshi)
const HOSHI_POINTS = [
  [3, 3], [3, 9], [3, 15],
  [9, 3], [9, 9], [9, 15],
  [15, 3], [15, 9], [15, 15]
];

export interface NodePlacement extends StoneProps {
  x: number;
  y: number;
  ukdlRef?: string;
  stepIdx?: number;
}

interface BoardProps {
  placements: NodePlacement[];
  onIntersectionClick?: (x: number, y: number) => void;
}

export const Board: React.FC<BoardProps> = ({ placements, onIntersectionClick }) => {
  const gridSize = 19;
  
  // Create an empty 19x19 array to track placements easily
  const getStoneAt = (x: number, y: number): NodePlacement | undefined => {
    return placements.find(p => p.x === x && p.y === y);
  };

  const isHoshi = (x: number, y: number) => {
    return HOSHI_POINTS.some(([hx, hy]) => hx === x && hy === y);
  };

  const cells = [];

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const stone = getStoneAt(x, y);
      
      let borderClasses = styles.cell;
      if (y === 0) borderClasses += ` ${styles.top}`;
      if (x === 0) borderClasses += ` ${styles.left}`;
      if (x === gridSize - 1) borderClasses += ` ${styles.right}`;
      if (y === gridSize - 1) borderClasses += ` ${styles.bottom}`;

      cells.push(
        <div key={`${x}-${y}`} className={borderClasses}>
             {/* The visual intersection / star points */}
             {isHoshi(x, y) && !stone && <div className={styles.hoshi} />}
             
             {/* The clickable area and stone container */}
             <div 
                className={styles.intersection} 
                onClick={() => onIntersectionClick && onIntersectionClick(x, y)}
             >
                {stone && (
                  <Stone 
                    color={stone.color} 
                    isGhost={stone.isGhost} 
                    isQuantum={stone.isQuantum}
                    label={stone.ukdlRef}
                    intent={stone.intent}
                  />
                )}
             </div>
        </div>
      );
    }
  }

  return (
    <div className={styles.boardContainer}>
      <div className={styles.board}>
        {cells}
      </div>
    </div>
  );
};
