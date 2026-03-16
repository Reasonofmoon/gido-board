import { useState, useEffect } from 'react'
import { Board, NodePlacement } from './components/Board'
import { StrategyPanel, KifuMove } from './components/StrategyPanel'
import { FileCode2 } from 'lucide-react'
import './index.css'

// The original kifu data translated into board coordinates
const GAME_KIFU: KifuMove[] = [
  { n: 1, type: 'fuseki', target: '@ent:payment', intent: '결제 코어 도메인 화점 (Core Domain)', impact: '+structure' },
  { n: 2, type: 'fuseki', target: '@ent:stripe', intent: 'Stripe 연동 화점 (External API)', impact: '+structure' },
  { n: 3, type: 'joseki', target: '@act:stripe-joseki', intent: 'Stripe 정석 적용 (Webhook Secure)', impact: '++reliability' },
  { n: 4, type: 'sente', target: '@act:payment-tests', intent: 'TDD 선수 획득 (Sente via Tests)', impact: '++confidence' },
  { n: 5, type: 'attack', target: '@qst:feature-health', intent: '사활 판정 양자 상태 도입', impact: '+thickness' },
];

// Map each move to a visual placement on the 19x19 board
const PLACEMENTS_TIMELINE: NodePlacement[][] = [
  // Move 0: Empty
  [],
  // Move 1: Core Domain (Black - Core Team)
  [{ x: 3, y: 3, color: 'black', ukdlRef: '@ent:payment', intent: 'Core Domain', stepIdx: 1 }],
  // Move 2: Stripe (White - External)
  [
    { x: 3, y: 3, color: 'black', ukdlRef: '@ent:payment', intent: 'Core Domain', stepIdx: 1 },
    { x: 15, y: 3, color: 'white', ukdlRef: '@ent:stripe', intent: 'External Sys', stepIdx: 2 }
  ],
  // Move 3: Joseki (Black responding to White)
  [
    { x: 3, y: 3, color: 'black', ukdlRef: '@ent:payment', stepIdx: 1 },
    { x: 15, y: 3, color: 'white', ukdlRef: '@ent:stripe', stepIdx: 2 },
    { x: 14, y: 4, color: 'black', ukdlRef: '@act:stripe-joseki', intent: 'Joseki', stepIdx: 3 },
    { x: 16, y: 2, color: 'black', ukdlRef: 'rel:webhook', stepIdx: 3 }
  ],
  // Move 4: Sente (Tests forming a wall)
  [
    { x: 3, y: 3, color: 'black', ukdlRef: '@ent:payment', stepIdx: 1 },
    { x: 15, y: 3, color: 'white', ukdlRef: '@ent:stripe', stepIdx: 2 },
    { x: 14, y: 4, color: 'black', ukdlRef: '@act:stripe-joseki', stepIdx: 3 },
    { x: 16, y: 2, color: 'black', ukdlRef: 'rel:webhook', stepIdx: 3 },
    { x: 3, y: 4, color: 'black', ukdlRef: '@act:tests', intent: 'Sente (Tests)', stepIdx: 4 },
    { x: 4, y: 3, color: 'black', ukdlRef: '@sch:payment', stepIdx: 4 }
  ],
  // Move 5: Quantum State (Life/Death)
  [
    { x: 3, y: 3, color: 'black', ukdlRef: '@ent:payment', stepIdx: 1 },
    { x: 15, y: 3, color: 'white', ukdlRef: '@ent:stripe', stepIdx: 2 },
    { x: 14, y: 4, color: 'black', ukdlRef: '@act:stripe-joseki', stepIdx: 3 },
    { x: 16, y: 2, color: 'black', ukdlRef: 'rel:webhook', stepIdx: 3 },
    { x: 3, y: 4, color: 'black', ukdlRef: '@act:tests', stepIdx: 4 },
    { x: 4, y: 3, color: 'black', ukdlRef: '@sch:payment', stepIdx: 4 },
    // A quantum node wrapping the core domain
    { x: 4, y: 4, color: 'black', isQuantum: true, ukdlRef: '@qst:health', intent: 'Life/Death Status', stepIdx: 5 }
  ]
];

function App() {
  const [currentStep, setCurrentStep] = useState(5);
  const [placements, setPlacements] = useState<NodePlacement[]>(PLACEMENTS_TIMELINE[5]);
  const [isPaperclipMode, setIsPaperclipMode] = useState(false);

  // Sente percentage changes based on moves
  const senteMap = [20, 40, 40, 60, 85, 90]; 

  useEffect(() => {
    setPlacements(PLACEMENTS_TIMELINE[currentStep]);
    setIsPaperclipMode(false);
  }, [currentStep]);

  const handlePaperclip = () => {
    setIsPaperclipMode(true);
    // Add 3 ghost stones for Paperclip logic
    const paperclipPlacements: NodePlacement[] = [
      ...PLACEMENTS_TIMELINE[currentStep],
      { x: 3, y: 15, color: 'black', isGhost: true, ukdlRef: '🛡️ Solid Move', intent: 'DB Migration', stepIdx: 99 },
      { x: 9, y: 9, color: 'black', isGhost: true, ukdlRef: '🌟 Brilliant Move', intent: 'Event Sourcing', stepIdx: 99 },
      { x: 15, y: 15, color: 'white', isGhost: true, ukdlRef: '⚔️ Fighting Move', intent: 'Custom Parser', stepIdx: 99 }
    ];
    setPlacements(paperclipPlacements);
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      
      {/* Visualizer Area */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        
        {/* Floating Paperclip Button */}
        <button 
          onClick={handlePaperclip}
          style={{
            position: 'absolute', top: '2rem', right: '2rem',
            background: 'var(--bg-panel)', border: '1px solid var(--accent-cyan)',
            color: 'var(--accent-cyan)', padding: '0.75rem 1.5rem',
            borderRadius: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
            boxShadow: isPaperclipMode ? '0 0 20px rgba(34, 211, 238, 0.4)' : 'none',
            backdropFilter: 'blur(8px)', transition: 'all 0.3s'
          }}
        >
          <FileCode2 size={18} />
          <span>/paperclip (수 읽기)</span>
        </button>

        <Board placements={placements} />

        {isPaperclipMode && (
          <div className="glass-panel" style={{ marginTop: '2rem', padding: '1rem 2rem', display: 'flex', gap: '2rem' }}>
            <div><span style={{color: 'var(--accent-cyan)'}}>🛡️</span> 안전한 수 (Solid)</div>
            <div><span style={{color: '#a78bfa'}}>🌟</span> 묘수 (Brilliant)</div>
            <div><span style={{color: '#f87171'}}>⚔️</span> 승부수 (Fighting)</div>
          </div>
        )}
      </div>

      {/* Strategy Panel */}
      <div style={{ padding: '2rem 2rem 2rem 0' }}>
        <StrategyPanel 
          sentePercentage={senteMap[currentStep] || 50}
          moves={GAME_KIFU}
          currentMoveIndex={currentStep - 1}
          onMoveSelect={(idx) => setCurrentStep(idx + 1)}
        />
      </div>

    </div>
  )
}

export default App
