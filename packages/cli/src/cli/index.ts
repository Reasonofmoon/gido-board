#!/usr/bin/env node
/**
 * 碁道코딩 CLI — Entry Point
 *
 * "선수를 잡는 자가 판을 지배한다"
 *
 * Commands:
 *   gido scan    — 프로젝트 형세도 (Board Scan)
 *   gido         — 형세 요약 + 최선의 다음 수 추천 (coming in Phase 2)
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { scanProject } from '../encoder/board-state.js';
import { renderBoardState } from './renderer.js';

const program = new Command();

program
  .name('gido')
  .description('碁道코딩 CLI — 바둑 AI의 전략적 지혜를 코드에 심는 도구')
  .version('0.1.0');

// ── gido scan ──
program
  .command('scan')
  .description('프로젝트 형세도 출력 (Board Scan + Ownership Heatmap)')
  .argument('[dir]', 'Project directory to scan', '.')
  .action((dir: string) => {
    const targetDir = resolve(dir);
    console.log(`\n  Scanning ${targetDir}...\n`);

    try {
      const boardState = scanProject(targetDir);
      const output = renderBoardState(boardState);
      console.log(output);
    } catch (err) {
      console.error(`  Error: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

// ── gido (default) — Phase 2에서 구현 ──
program
  .command('analyze', { hidden: true })
  .description('[Phase 2] 후보 행동 리스트 + ΔHealth 출력')
  .action(() => {
    console.log('\n  ⏳ gido analyze will be available in Phase 2 (Policy & Value Engine).\n');
  });

program
  .command('plan', { hidden: true })
  .description('[Phase 3] n수 앞 개발 경로 탐색 (MCTS)')
  .action(() => {
    console.log('\n  ⏳ gido plan will be available in Phase 3 (MCTS Search Engine).\n');
  });

program
  .command('play', { hidden: true })
  .description('[Phase 4] 선택한 행동 실행 + Git 커밋')
  .action(() => {
    console.log('\n  ⏳ gido play will be available in Phase 4 (CLI UX Integration).\n');
  });

program
  .command('review', { hidden: true })
  .description('[Phase 2] 최근 변경의 ΔHealth 복기')
  .action(() => {
    console.log('\n  ⏳ gido review will be available in Phase 2.\n');
  });

program.parse();
