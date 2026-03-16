import React from 'react';
import styles from './Stone.module.css';

export interface StoneProps {
  color: 'black' | 'white';
  isGhost?: boolean;
  isQuantum?: boolean;
  label?: string;
  intent?: string;
}

export const Stone: React.FC<StoneProps> = ({ 
  color, 
  isGhost = false, 
  isQuantum = false,
  label,
  intent
}) => {
  const classNames = [
    styles.stone,
    styles[color],
    isGhost ? styles.ghost : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={classNames}>
      {isQuantum && <div className={styles.quantum} />}
      
      {(label || intent) && (
        <div className={styles.tooltip}>
          {label && <div className={styles.label}>{label}</div>}
          {intent && <div>{intent}</div>}
        </div>
      )}
    </div>
  );
};
