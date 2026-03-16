import React from 'react';
import { Activity, Shield, Zap, GitBranch } from 'lucide-react';
import styles from './StrategyPanel.module.css';

export interface KifuMove {
  n: number;
  type: 'fuseki' | 'joseki' | 'sente' | 'attack' | 'defend';
  target: string;
  intent: string;
  impact: string;
}

interface StrategyPanelProps {
  sentePercentage: number;
  moves: KifuMove[];
  currentMoveIndex: number;
  onMoveSelect: (index: number) => void;
}

export const StrategyPanel: React.FC<StrategyPanelProps> = ({
  sentePercentage,
  moves,
  currentMoveIndex,
  onMoveSelect
}) => {
  return (
    <div className={`glass-panel ${styles.panel}`}>
      
      <div className={styles.header}>
        <h1 className={`${styles.title} text-gradient`}>UKDL 碁道</h1>
        <p className={styles.subtitle}>
          <GitBranch size={16} />
          Payment System MVP Sprint
        </p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Zap size={14} />
          선수 (Sente) Initiative
        </h2>
        <div className={styles.senteMeter}>
          <div 
            className={styles.senteFill} 
            style={{ width: `${sentePercentage}%` }} 
          />
        </div>
        <div className={styles.senteLabels}>
          <span>Reactive (Gote)</span>
          <span>Proactive (Sente)</span>
        </div>
      </div>

      <div className={styles.section} style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <h2 className={styles.sectionTitle}>
          <Activity size={14} />
          기보 (Kifu) / History
        </h2>
        
        <div className={styles.kifuList}>
          {moves.map((move, idx) => (
            <div 
              key={move.n}
              className={`${styles.kifuItem} ${idx === currentMoveIndex ? styles.active : ''}`}
              onClick={() => onMoveSelect(idx)}
            >
              <div className={styles.moveNumber}>{move.n}</div>
              <div className={styles.moveContent}>
                <div className={styles.moveHeader}>
                  <span className={styles.moveTarget}>{move.target}</span>
                  <span className={`${styles.moveType} ${styles[move.type]}`}>{move.type}</span>
                </div>
                <div className={styles.moveIntent}>{move.intent}</div>
                <div className={styles.moveImpact}>{move.impact}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
