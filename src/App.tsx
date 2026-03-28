import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Board, type NodePlacement } from './components/Board'
import { StrategyPanel, type KifuMove } from './components/StrategyPanel'
import { FileCode2 } from 'lucide-react'
import type { Recommendation } from './lib/recommend'

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
  [],
  [{ x: 3, y: 3, color: 'black', ukdlRef: '@ent:payment', intent: 'Core Domain', stepIdx: 1 }],
  [
    { x: 3, y: 3, color: 'black', ukdlRef: '@ent:payment', intent: 'Core Domain', stepIdx: 1 },
    { x: 15, y: 3, color: 'white', ukdlRef: '@ent:stripe', intent: 'External Sys', stepIdx: 2 }
  ],
  [
    { x: 3, y: 3, color: 'black', ukdlRef: '@ent:payment', stepIdx: 1 },
    { x: 15, y: 3, color: 'white', ukdlRef: '@ent:stripe', stepIdx: 2 },
    { x: 14, y: 4, color: 'black', ukdlRef: '@act:stripe-joseki', intent: 'Joseki', stepIdx: 3 },
    { x: 16, y: 2, color: 'black', ukdlRef: 'rel:webhook', stepIdx: 3 }
  ],
  [
    { x: 3, y: 3, color: 'black', ukdlRef: '@ent:payment', stepIdx: 1 },
    { x: 15, y: 3, color: 'white', ukdlRef: '@ent:stripe', stepIdx: 2 },
    { x: 14, y: 4, color: 'black', ukdlRef: '@act:stripe-joseki', stepIdx: 3 },
    { x: 16, y: 2, color: 'black', ukdlRef: 'rel:webhook', stepIdx: 3 },
    { x: 3, y: 4, color: 'black', ukdlRef: '@act:tests', intent: 'Sente (Tests)', stepIdx: 4 },
    { x: 4, y: 3, color: 'black', ukdlRef: '@sch:payment', stepIdx: 4 }
  ],
  [
    { x: 3, y: 3, color: 'black', ukdlRef: '@ent:payment', stepIdx: 1 },
    { x: 15, y: 3, color: 'white', ukdlRef: '@ent:stripe', stepIdx: 2 },
    { x: 14, y: 4, color: 'black', ukdlRef: '@act:stripe-joseki', stepIdx: 3 },
    { x: 16, y: 2, color: 'black', ukdlRef: 'rel:webhook', stepIdx: 3 },
    { x: 3, y: 4, color: 'black', ukdlRef: '@act:tests', stepIdx: 4 },
    { x: 4, y: 3, color: 'black', ukdlRef: '@sch:payment', stepIdx: 4 },
    { x: 4, y: 4, color: 'black', isQuantum: true, ukdlRef: '@qst:health', intent: 'Life/Death Status', stepIdx: 5 }
  ]
];

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const wizardState = location.state as {
    language?: { name: string; icon: string };
    libraries?: { name: string; icon: string; description: string }[];
    kifuSequence?: Recommendation['kifuSequence'];
    goal?: string;
  } | null;

  const [currentStep, setCurrentStep] = useState(5);
  const [placements, setPlacements] = useState<NodePlacement[]>(PLACEMENTS_TIMELINE[5]);
  const [isPaperclipMode, setIsPaperclipMode] = useState(false);
  const [showPanel, setShowPanel] = useState(true);

  const senteMap = [20, 40, 40, 60, 85, 90];

  useEffect(() => {
    setPlacements(PLACEMENTS_TIMELINE[currentStep]);
    setIsPaperclipMode(false);
  }, [currentStep]);

  const handlePaperclip = () => {
    setIsPaperclipMode(true);
    const paperclipPlacements: NodePlacement[] = [
      ...PLACEMENTS_TIMELINE[currentStep],
      { x: 3, y: 15, color: 'black', isGhost: true, ukdlRef: '\u{1F6E1}\uFE0F Solid Move', intent: 'DB Migration', stepIdx: 99 },
      { x: 9, y: 9, color: 'black', isGhost: true, ukdlRef: '\u{1F31F} Brilliant Move', intent: 'Event Sourcing', stepIdx: 99 },
      { x: 15, y: 15, color: 'white', isGhost: true, ukdlRef: '\u2694\uFE0F Fighting Move', intent: 'Custom Parser', stepIdx: 99 }
    ];
    setPlacements(paperclipPlacements);
  };

  return (
    <div className="flex flex-col md:flex-row w-screen h-screen overflow-hidden bg-[#07090F]">

      {/* Top bar (mobile) / hidden (desktop) */}
      <div className="flex md:hidden items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#07090F]/90 backdrop-blur-md">
        <button onClick={() => navigate('/')} className="text-lg font-black">
          <span className="text-cyan-400">碁</span><span className="text-white">Vibe</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePaperclip}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs
                       border border-cyan-500/30 text-cyan-400 bg-[#07090F]
                       active:scale-95 transition-all touch-manipulation"
          >
            <FileCode2 size={14} />
            <span>수 읽기</span>
          </button>
          <button
            onClick={() => setShowPanel(p => !p)}
            className="px-3 py-1.5 rounded-full text-xs border border-white/10 text-white/50
                       active:scale-95 transition-all touch-manipulation"
          >
            {showPanel ? '보드만' : '기보'}
          </button>
        </div>
      </div>

      {/* Wizard recommendation banner */}
      {wizardState?.language && (
        <div className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border-b border-cyan-500/20 text-sm md:hidden">
          <span>{wizardState.language.icon}</span>
          <span className="text-cyan-400 font-semibold">{wizardState.language.name}</span>
          <span className="text-white/30">스택으로 시작</span>
        </div>
      )}

      {/* Board area */}
      <div className="flex-1 flex flex-col items-center justify-center relative min-h-0">
        {/* Desktop paperclip button */}
        <button
          onClick={handlePaperclip}
          className="hidden md:flex absolute top-8 right-8 items-center gap-2
                     px-6 py-3 rounded-full border border-cyan-500/30 text-cyan-400
                     bg-[rgba(15,23,42,0.6)] backdrop-blur-md cursor-pointer
                     hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all"
          style={{ boxShadow: isPaperclipMode ? '0 0 20px rgba(34, 211, 238, 0.4)' : 'none' }}
        >
          <FileCode2 size={18} />
          <span>/paperclip (수 읽기)</span>
        </button>

        <Board placements={placements} />

        {isPaperclipMode && (
          <div className="glass-panel mt-4 px-4 py-3 flex gap-4 sm:gap-8 text-xs sm:text-sm">
            <div><span className="text-cyan-400">{'🛡️'}</span> 안전한 수</div>
            <div><span className="text-purple-400">{'🌟'}</span> 묘수</div>
            <div><span className="text-red-400">{'⚔️'}</span> 승부수</div>
          </div>
        )}
      </div>

      {/* Strategy Panel — bottom sheet on mobile, sidebar on desktop */}
      {showPanel && (
        <div className="md:py-8 md:pr-8">
          <StrategyPanel
            sentePercentage={senteMap[currentStep] || 50}
            moves={GAME_KIFU}
            currentMoveIndex={currentStep - 1}
            onMoveSelect={(idx) => setCurrentStep(idx + 1)}
          />
        </div>
      )}
    </div>
  )
}

export default App
