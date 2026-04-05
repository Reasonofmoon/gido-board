# gido-board (碁Vibe Board) - 재현 명세서

## 제품 개요

Goal-driven 바이브 코딩 워크벤치. 바둑(Go/Baduk) 메타포를 활용한 소프트웨어 개발 플랫폼으로, 사용자가 프로젝트 목표를 설정하면 언어/라이브러리 추천을 받고, 기보(kifu) 스타일의 개발 시퀀스를 따르는 구조. 19x19 바둑판 위에 코드 모듈을 돌로 배치하고, 포석(Fuseki)/정석(Joseki)/선수(Sente)/묘수(Myo)/끝내기(Endgame) 등 바둑 용어로 개발 단계를 표현한다.

## 기술 스택

| 구분 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | React | ^19.2.4 |
| 언어 | TypeScript | ~5.9.3 |
| 빌드 | Vite | ^8.0.0 |
| 라우팅 | react-router-dom | ^7.13.2 |
| 스타일링 | Tailwind CSS v4 | ^4.2.2 |
| Tailwind Vite 플러그인 | @tailwindcss/vite | ^4.2.2 |
| 아이콘 | Lucide React | ^0.577.0 |

## 디렉터리 구조

```
gido-board/
├── package.json
├── vite.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── eslint.config.js
├── index.html
├── CLAUDE.md                  # 프로젝트 컨텍스트 (AI 에이전트용)
├── README.md
├── src/
│   ├── App.tsx                # 메인 보드 뷰 (기보 재생 + 전략 패널)
│   ├── main.tsx
│   ├── index.css
│   ├── pages/
│   │   ├── LandingPage.tsx    # 랜딩 페이지 (Hero + CTA)
│   │   └── GoalWizard.tsx     # 3단계 온보딩 (목표 → 경험 → 추천)
│   ├── components/
│   │   ├── Board.tsx          # 19x19 바둑판 SVG 렌더링
│   │   ├── Board.module.css   # Board CSS Module
│   │   ├── Stone.tsx          # 바둑돌 컴포넌트 (양자 상태 지원)
│   │   ├── Stone.module.css   # Stone CSS Module
│   │   ├── StrategyPanel.tsx  # 전략 패널 (기보 목록 + 승률)
│   │   ├── StrategyPanel.module.css
│   │   ├── GoalWizard/        # GoalWizard 하위 컴포넌트
│   │   ├── prompt-generator.ts # 프롬프트 생성기
│   │   └── recommend.ts       # (재위치된 추천 엔진)
│   ├── data/
│   │   └── mandala.ts         # 언어/라이브러리 카탈로그 (만다라트)
│   └── lib/
│       └── recommend.ts       # 추천 엔진 (목표 기반 스택 추천)
├── packages/
│   └── cli/                   # CLI 패키지
└── dist/
```

## 아키텍처 상세

### 라우팅 구조

| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/` | LandingPage | 랜딩 (Hero + CTA) |
| `/wizard` | GoalWizard | 3단계 온보딩 위저드 |
| `/board` | App (Board) | 바둑판 + 전략 패널 |

### GoalWizard 3단계

1. **Goal (목표 설정)**: 프로젝트 목표 입력
2. **Experience (경험 수준)**: 개발 경험 레벨 선택
3. **Recommendation (추천)**: 언어/라이브러리 스택 자동 추천

### 바둑판 (Board) 컴포넌트

- 19x19 격자 SVG 렌더링
- `NodePlacement` 타입: `{x, y, color, ukdlRef, intent, stepIdx, isGhost?, isQuantum?}`
- 고스트 돌: 후보 착점 미리보기
- 양자 상태 돌(`isQuantum`): 사활 판정 미결 상태 표현

### 전략 패널 (StrategyPanel)

- 기보(KifuMove) 목록 표시
- 수 이동 내비게이션
- 승률(Win Rate) 게이지
- 착점 유형: fuseki(포석), joseki(정석), sente(선수), attack(공격)

### 기보 데이터 구조

```typescript
interface KifuMove {
  n: number;          // 수 번호
  type: string;       // fuseki | joseki | sente | attack
  target: string;     // UKDL 참조 (@ent:payment, @act:tests 등)
  intent: string;     // 착수 의도 설명 (한국어)
  impact: string;     // 영향 (+structure, ++reliability 등)
}
```

### Paperclip 모드 (수 읽기)

- `/paperclip` 버튼으로 후보 착점 3개 표시
  - 안전한 수 (Solid Move)
  - 묘수 (Brilliant Move)
  - 승부수 (Fighting Move)

### 바둑 개발 개념 매핑

| 바둑 용어 | 개발 의미 |
|-----------|-----------|
| 포석 (Fuseki) | 프로젝트 기반/설정 |
| 정석 (Joseki) | 표준 아키텍처 패턴 |
| 선수 (Sente) | 핵심 기능 선점 |
| 묘수 (Myo) | 최적 리팩토링 |
| 끝내기 (Endgame) | 배포 및 마무리 |
| 승률 (Win Rate) | 프로젝트 건강도 (%) |

## 핵심 모듈/컴포넌트 설명

### lib/recommend.ts
목표 + 경험 레벨 기반 언어/라이브러리 스택 추천 엔진. mandala.ts 카탈로그에서 최적 조합 선택.

### data/mandala.ts
언어/라이브러리 카탈로그. 만다라트(Mandala Chart) 형식으로 기술 스택 분류.

### components/prompt-generator.ts
추천 결과를 바탕으로 개발 가이드 프롬프트 생성.

## 환경 변수

없음. 순수 프론트엔드 앱으로 외부 API 호출 없음.

## 실행 방법

```bash
cd gido-board
npm install
npm run dev          # Vite 개발 서버

npm run build        # 프로덕션 빌드
npm run preview
```

## 재현 시 주의사항

- Vite v8 + React v19 + Tailwind CSS v4 사용 — 최신 버전
- CSS Modules(Board.module.css, Stone.module.css, StrategyPanel.module.css) + Tailwind 혼합 사용
- 다크 모드 전용 (bg-[#07090F])
- 모바일 퍼스트 반응형 디자인 (최소 터치 타겟: 44px)
- 한국어 UI, 영어 코드 주석 컨벤션
- UKDL(Universal Knowledge Description Language) 참조 체계 사용 (@ent:, @act:, @sch:, @qst:)
- `packages/cli/` 패키지 존재하나 독립 실행 가능
