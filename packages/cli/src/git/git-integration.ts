/**
 * 碁道코딩 — Git Integration
 *
 * simple-git 기반 Git 통합.
 * 바둑의 기보(棋譜) = Git 커밋 히스토리
 *
 * Features:
 * - `gido play`: 행동 실행 후 자동 커밋 (Go 메타데이터 포함)
 * - `gido review`: 최근 커밋의 ΔHealth 복기
 * - 커밋 메시지에 바둑 전략 분류 + ΔHealth 포함
 */

import { simpleGit, type SimpleGit, type DiffResult } from 'simple-git';
import { resolve } from 'path';
import type { DevAction, MoveType } from '../encoder/types.js';
import type { FitnessEvaluation } from '../value/fitness-function.js';

export interface GitStatus {
  isRepo: boolean;
  branch: string;
  modified: string[];
  staged: string[];
  isClean: boolean;
}

export interface CommitInfo {
  hash: string;
  message: string;
  date: string;
  author: string;
}

/** Go strategy emoji for commit messages */
const MOVE_EMOJIS: Record<MoveType, string> = {
  fuseki: '🏗️',
  joseki: '📐',
  sente: '⚡',
  gote: '🛡️',
  attack: '⚔️',
  defend: '🏰',
  review: '📖',
};

/**
 * Initialize simple-git for a project directory.
 */
export function getGit(dir: string): SimpleGit {
  return simpleGit(resolve(dir));
}

/**
 * Get the current Git status of the project.
 */
export async function getGitStatus(dir: string): Promise<GitStatus> {
  const git = getGit(dir);

  try {
    const status = await git.status();
    const branch = await git.revparse(['--abbrev-ref', 'HEAD']).catch(() => 'unknown');

    return {
      isRepo: true,
      branch: branch.trim(),
      modified: [...status.modified, ...status.not_added],
      staged: status.staged,
      isClean: status.isClean(),
    };
  } catch {
    return {
      isRepo: false,
      branch: '',
      modified: [],
      staged: [],
      isClean: true,
    };
  }
}

/**
 * Build a Gido-style commit message with Go metadata.
 *
 * Format: [gido:<moveType>] <intent> (ΔHealth: <delta>)
 * 
 * Like a 기보(棋譜) entry: each commit records the strategic intent,
 * not just what changed, but WHY from a board-reading perspective.
 */
export function buildCommitMessage(
  evaluation: FitnessEvaluation,
  moveNumber?: number
): string {
  const { action, deltaHealth, badukTerm } = evaluation;
  const emoji = MOVE_EMOJIS[action.type] || '♟️';
  const delta = deltaHealth >= 0 ? `+${deltaHealth.toFixed(2)}` : deltaHealth.toFixed(2);
  const moveLabel = moveNumber ? `#${moveNumber} ` : '';

  const subject = `${emoji} [gido:${action.type}] ${moveLabel}${action.intent}`;
  
  const body = [
    `ΔHealth: ${delta}`,
    `분류: ${badukTerm}`,
    `행동: ${action.actionKind}`,
    `대상: ${action.target}`,
    '',
    `근거: ${action.rationale}`,
    '',
    `---`,
    `碁道코딩 CLI v1.0 — 바둑 AI 전략 기반 커밋`,
  ].join('\n');

  return `${subject}\n\n${body}`;
}

/**
 * Stage all changes and commit with Gido metadata.
 */
export async function gidoCommit(
  dir: string,
  evaluation: FitnessEvaluation,
  moveNumber?: number,
  stageAll: boolean = true
): Promise<CommitInfo> {
  const git = getGit(dir);
  const message = buildCommitMessage(evaluation, moveNumber);

  if (stageAll) {
    await git.add('.');
  }

  const result = await git.commit(message);

  return {
    hash: result.commit || 'unknown',
    message: message.split('\n')[0], // subject only
    date: new Date().toISOString(),
    author: '',
  };
}

/**
 * Get the diff of recent commits for review analysis.
 */
export async function getRecentDiff(dir: string, count: number = 1): Promise<string> {
  const git = getGit(dir);

  try {
    const diff = await git.diff([`HEAD~${count}`, 'HEAD']);
    return diff;
  } catch {
    // Fallback: get working directory diff
    try {
      const diff = await git.diff();
      return diff || '(no changes)';
    } catch {
      return '(no git history available)';
    }
  }
}

/**
 * Get recent commit log.
 */
export async function getRecentCommits(dir: string, count: number = 5): Promise<CommitInfo[]> {
  const git = getGit(dir);

  try {
    const log = await git.log({ maxCount: count });
    return log.all.map(entry => ({
      hash: entry.hash.substring(0, 7),
      message: entry.message,
      date: entry.date,
      author: entry.author_name,
    }));
  } catch {
    return [];
  }
}

/**
 * Get the move number from existing Gido commits.
 */
export async function getNextMoveNumber(dir: string): Promise<number> {
  const commits = await getRecentCommits(dir, 100);
  let maxMove = 0;

  for (const commit of commits) {
    const match = commit.message.match(/\[gido:\w+\]\s*#(\d+)/);
    if (match) {
      maxMove = Math.max(maxMove, parseInt(match[1], 10));
    }
  }

  return maxMove + 1;
}
