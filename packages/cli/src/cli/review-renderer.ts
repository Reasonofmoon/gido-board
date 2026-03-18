/**
 * 碁道코딩 — Review Renderer
 *
 * 복기(復棋) 결과를 터미널에 렌더링.
 * 최근 커밋의 변경이 프로젝트 건강도에 미친 영향을 시각화.
 *
 * KataGo의 "리뷰 모드" 대응:
 *  - 각 수(커밋)의 ΔHealth를 분석
 *  - 더 나은 수가 있었는지 제안
 */

import type { BoardState } from '../encoder/types.js';
import type { FitnessEvaluation } from '../value/fitness-function.js';
import type { CommitInfo } from '../git/git-integration.js';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const FG = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  magenta: '\x1b[35m',
};

export interface ReviewResult {
  currentState: BoardState;
  previousHealth: number | null;
  currentHealth: number;
  deltaHealth: number | null;
  recentCommits: CommitInfo[];
  suggestions: FitnessEvaluation[];
}

/**
 * Render the review (복기) output.
 */
export function renderReview(result: ReviewResult): string {
  const lines: string[] = [];

  // Header
  lines.push('');
  lines.push(`${BOLD}${FG.cyan}  ┌──────────────────────────────────────────────────┐${RESET}`);
  lines.push(`${BOLD}${FG.cyan}  │        碁道코딩 — 復棋 (Post-Game Review)          │${RESET}`);
  lines.push(`${BOLD}${FG.cyan}  └──────────────────────────────────────────────────┘${RESET}`);
  lines.push('');

  // Health trend
  const cur = result.currentHealth;
  const curColor = cur >= 0 ? FG.green : FG.red;
  lines.push(`  ${BOLD}현재 건강도${RESET}: ${curColor}${cur.toFixed(2)}${RESET}`);

  if (result.deltaHealth !== null && result.previousHealth !== null) {
    const delta = result.deltaHealth;
    const deltaColor = delta >= 0 ? FG.green : FG.red;
    const deltaSign = delta >= 0 ? '+' : '';
    const prevColor = result.previousHealth >= 0 ? FG.green : FG.red;

    lines.push(`  ${BOLD}이전 건강도${RESET}: ${prevColor}${result.previousHealth.toFixed(2)}${RESET}`);
    lines.push(`  ${BOLD}ΔHealth${RESET}:     ${deltaColor}${deltaSign}${delta.toFixed(2)}${RESET}`);

    // Verdict
    if (delta >= 0.1) {
      lines.push(`  ${FG.green}✨ 묘수(妙手)! 프로젝트 건강도가 크게 향상되었습니다.${RESET}`);
    } else if (delta >= 0) {
      lines.push(`  ${FG.green}✅ 본수(本手). 프로젝트가 안정적으로 유지되고 있습니다.${RESET}`);
    } else if (delta > -0.05) {
      lines.push(`  ${FG.yellow}🟡 의문수(疑問手). 약간의 건강도 하락이 관찰됩니다.${RESET}`);
    } else if (delta > -0.1) {
      lines.push(`  ${FG.red}🟠 악수(惡手). 건강도가 눈에 띄게 하락했습니다.${RESET}`);
    } else {
      lines.push(`  ${BOLD}${FG.red}🔴 대악수(大惡手)! 긴급한 개선이 필요합니다.${RESET}`);
    }
  }

  lines.push('');

  // Recent commits (기보, Kifu)
  if (result.recentCommits.length > 0) {
    lines.push(`  ${BOLD}최근 기보 (Recent Kifu)${RESET}`);
    lines.push(`  ${FG.gray}${'─'.repeat(60)}${RESET}`);

    for (const commit of result.recentCommits) {
      const isGido = commit.message.includes('[gido:');
      const icon = isGido ? '♟️' : '📝';
      const msg = commit.message.length > 55
        ? commit.message.substring(0, 52) + '...'
        : commit.message;
      lines.push(`  ${icon} ${FG.magenta}${commit.hash}${RESET} ${msg}`);
      lines.push(`    ${DIM}${commit.date} by ${commit.author}${RESET}`);
    }

    lines.push(`  ${FG.gray}${'─'.repeat(60)}${RESET}`);
  }

  // Suggestions for improvement
  if (result.suggestions.length > 0) {
    lines.push('');
    lines.push(`  ${BOLD}다음 수 제안 (Next Move Suggestions)${RESET}`);

    for (let i = 0; i < Math.min(3, result.suggestions.length); i++) {
      const s = result.suggestions[i];
      const delta = s.deltaHealth >= 0 ? `+${s.deltaHealth.toFixed(2)}` : s.deltaHealth.toFixed(2);
      lines.push(`  ${i + 1}. ${BOLD}${s.action.intent}${RESET}`);
      lines.push(`     ${FG.cyan}${s.action.type}${RESET} | ΔHealth: ${FG.green}${delta}${RESET} | ${s.action.target}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}
