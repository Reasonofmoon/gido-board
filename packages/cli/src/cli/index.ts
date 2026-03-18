#!/usr/bin/env node
/**
 * 碁道코딩 CLI — Entry Point
 *
 * "선수를 잡는 자가 판을 지배한다"
 *
 * Commands:
 *   gido scan      — 프로젝트 형세도 (Board Scan)
 *   gido analyze   — 후보수 분석 (Move Analysis)
 *   gido plan      — n수 앞 개발 경로 탐색 (MCTS)
 *   gido play      — 행동 실행 + Git 커밋
 *   gido review    — 최근 변경의 ΔHealth 복기
 *   gido board     — 웹 대시보드 실행
 *   gido           — Quick read (형세 요약 + 최선의 다음 수)
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { scanProject } from '../encoder/board-state.js';
import { renderBoardState } from './renderer.js';
import { analyzeProject } from '../value/move-evaluator.js';
import { renderAnalysis } from './analyze-renderer.js';
import { searchPlan } from '../search/mcts-engine.js';
import { renderPlan } from './plan-renderer.js';
import { getGitStatus, gidoCommit, getRecentCommits, getNextMoveNumber } from '../git/git-integration.js';
import { renderReview, type ReviewResult } from './review-renderer.js';
import { evaluateAllActions } from '../value/fitness-function.js';
import { generateActions } from '../policy/policy-engine.js';

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

// ── gido analyze ──
program
  .command('analyze')
  .description('후보 행동 분석 + ΔHealth 출력 (Move Analysis)')
  .argument('[dir]', 'Project directory to analyze', '.')
  .option('--provider <provider>', 'LLM provider: anthropic, openai, or heuristic', undefined)
  .option('--model <model>', 'LLM model name override', undefined)
  .action(async (dir: string, opts: { provider?: string; model?: string }) => {
    const targetDir = resolve(dir);
    console.log(`\n  Scanning & analyzing ${targetDir}...\n`);

    try {
      const boardState = scanProject(targetDir);
      const llmConfig: any = {};
      if (opts.provider) llmConfig.provider = opts.provider;
      if (opts.model) llmConfig.model = opts.model;

      const result = await analyzeProject(boardState, llmConfig);
      const output = renderAnalysis(result);
      console.log(output);
    } catch (err) {
      console.error(`  Error: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

// ── gido plan ──
program
  .command('plan')
  .description('n수 앞 개발 경로 탐색 (MCTS Search)')
  .argument('[dir]', 'Project directory', '.')
  .option('--depth <depth>', 'Search depth (number of steps ahead)', '3')
  .option('--simulations <n>', 'Number of MCTS simulations', '12')
  .action(async (dir: string, opts: { depth?: string; simulations?: string }) => {
    const targetDir = resolve(dir);
    const depth = parseInt(opts.depth || '3', 10);
    const sims = parseInt(opts.simulations || '12', 10);
    console.log(`\n  Scanning & planning ${depth}수 ahead (${sims} simulations)...\n`);

    try {
      const boardState = scanProject(targetDir);
      const result = await searchPlan(boardState, {
        maxDepth: depth,
        numSimulations: sims,
      });
      const output = renderPlan(result, boardState.summary.overallHealth);
      console.log(output);
    } catch (err) {
      console.error(`  Error: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

// ── gido play ──
program
  .command('play')
  .description('후보수를 선택하고 Git에 기보로 기록 (Execute + Commit)')
  .argument('[dir]', 'Project directory', '.')
  .option('--move <n>', 'Select move number from analyze output (1-based)', '1')
  .option('--dry-run', 'Show commit message without actually committing')
  .action(async (dir: string, opts: { move?: string; dryRun?: boolean }) => {
    const targetDir = resolve(dir);
    const moveIndex = parseInt(opts.move || '1', 10) - 1;

    try {
      // Check git status
      const gitStatus = await getGitStatus(targetDir);
      if (!gitStatus.isRepo) {
        console.error('\n  ❌ Not a Git repository. Initialize with `git init` first.\n');
        process.exit(1);
      }

      // Scan + Analyze
      console.log('\n  Scanning & analyzing...\n');
      const boardState = scanProject(targetDir);
      const policyOutput = await generateActions(boardState);
      const evaluations = evaluateAllActions(policyOutput.actions, boardState);

      if (evaluations.length === 0) {
        console.log('  No actions available. The codebase may be in optimal state.\n');
        return;
      }

      // Select move
      const selected = evaluations[Math.min(moveIndex, evaluations.length - 1)];
      const moveNumber = await getNextMoveNumber(targetDir);

      // Display selected move
      const delta = selected.deltaHealth >= 0 ? `+${selected.deltaHealth.toFixed(2)}` : selected.deltaHealth.toFixed(2);
      console.log(`  ${'\x1b[1m'}Selected move #${moveNumber}: ${selected.action.intent}${'\x1b[0m'}`);
      console.log(`  ${selected.badukTerm}  |  ΔHealth: ${delta}`);
      console.log(`  Target: ${selected.action.target}\n`);

      if (opts.dryRun) {
        const { buildCommitMessage } = await import('../git/git-integration.js');
        const msg = buildCommitMessage(selected, moveNumber);
        console.log(`  ${'\x1b[90m'}--- Commit Message (dry-run) ---${'\x1b[0m'}`);
        console.log(`  ${msg.split('\n').join('\n  ')}`);
        console.log(`  ${'\x1b[90m'}--- End ---${'\x1b[0m'}\n`);
        return;
      }

      // Check for staged/modified files
      if (gitStatus.isClean) {
        console.log('  ⚠️  No changes to commit. Make your changes first, then run `gido play`.\n');
        return;
      }

      // Commit
      const result = await gidoCommit(targetDir, selected, moveNumber);
      console.log(`  ✅ Committed: ${'\x1b[35m'}${result.hash}${'\x1b[0m'}`);
      console.log(`  ${result.message}\n`);

    } catch (err) {
      console.error(`  Error: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

// ── gido review ──
program
  .command('review')
  .description('최근 변경의 ΔHealth 복기 (Post-Game Review)')
  .argument('[dir]', 'Project directory', '.')
  .option('--commits <n>', 'Number of recent commits to review', '5')
  .action(async (dir: string, opts: { commits?: string }) => {
    const targetDir = resolve(dir);
    const commitCount = parseInt(opts.commits || '5', 10);

    try {
      // Scan current state
      const boardState = scanProject(targetDir);
      const currentHealth = boardState.summary.overallHealth;

      // Get recent commits
      const recentCommits = await getRecentCommits(targetDir, commitCount);

      // Try to estimate previous health (heuristic: assume small positive drift)
      // In a future version, we'd store BoardState snapshots per commit
      const lastGidoCommit = recentCommits.find(c => c.message.includes('ΔHealth:'));
      let previousHealth: number | null = null;
      let deltaHealth: number | null = null;

      if (lastGidoCommit) {
        const match = lastGidoCommit.message.match(/ΔHealth:\s*([+-]?\d+\.?\d*)/);
        if (match) {
          const lastDelta = parseFloat(match[1]);
          previousHealth = currentHealth - lastDelta;
          deltaHealth = lastDelta;
        }
      }

      // Generate next-move suggestions
      const policyOutput = await generateActions(boardState);
      const suggestions = evaluateAllActions(policyOutput.actions, boardState);

      const reviewResult: ReviewResult = {
        currentState: boardState,
        previousHealth,
        currentHealth,
        deltaHealth,
        recentCommits,
        suggestions,
      };

      console.log(renderReview(reviewResult));

    } catch (err) {
      console.error(`  Error: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

// ── gido board ──
program
  .command('board')
  .description('碁道 웹 대시보드 실행 (Web Dashboard)')
  .argument('[dir]', 'Project directory', '.')
  .option('--port <port>', 'Server port', '5173')
  .action(async (dir: string, opts: { port?: string }) => {
    const targetDir = resolve(dir);
    const { existsSync } = await import('fs');
    const { join } = await import('path');
    const { execSync, spawn } = await import('child_process');

    // Check if the gido-board React app exists (sibling to packages/cli)
    const boardRoot = resolve(targetDir, '../../');
    const boardSrc = join(boardRoot, 'src', 'App.tsx');

    if (!existsSync(boardSrc)) {
      console.log('\n  碁道 Board web app not found.');
      console.log('  Expected at: ' + boardRoot);
      console.log('  Run from the gido-board monorepo root.\n');
      return;
    }

    // First, scan and write board data as JSON for the web app
    console.log('\n  Scanning project for dashboard data...\n');
    const boardState = scanProject(targetDir);

    const dataPath = join(boardRoot, 'public', 'gido-scan.json');
    const { writeFileSync, mkdirSync } = await import('fs');
    const publicDir = join(boardRoot, 'public');
    if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });

    // Serialize (Maps → objects for JSON)
    const serializable = {
      ...boardState,
      graph: {
        ...boardState.graph,
        nodes: Object.fromEntries(boardState.graph.nodes),
      },
      ownershipMap: Object.fromEntries(boardState.ownershipMap),
    };
    writeFileSync(dataPath, JSON.stringify(serializable, null, 2));
    console.log(`  📊 Scan data written to ${dataPath}`);

    // Launch the dev server
    console.log(`  🌐 Starting dashboard on http://localhost:${opts.port}...\n`);

    const child = spawn('npm', ['run', 'dev', '--', '--port', opts.port || '5173'], {
      cwd: boardRoot,
      stdio: 'inherit',
      shell: true,
    });

    child.on('error', (err) => {
      console.error(`  Failed to start dashboard: ${err.message}`);
    });
  });

// ── gido (default) — Quick recommendation ──
program
  .command('recommend', { isDefault: true })
  .description('형세 요약 + 최선의 다음 수 1개 추천')
  .argument('[dir]', 'Project directory', '.')
  .action(async (dir: string) => {
    const targetDir = resolve(dir);

    try {
      const boardState = scanProject(targetDir);
      const result = await analyzeProject(boardState);

      const s = boardState.summary;
      const healthColor = s.overallHealth >= 0 ? '\x1b[32m' : '\x1b[31m';
      console.log('');
      console.log(`  碁道코딩 — Quick Read`);
      console.log(`  Health: ${healthColor}${s.overallHealth.toFixed(2)}\x1b[0m  |  ${s.totalFiles} files  |  Cycles: ${s.cycleCount}`);

      if (result.evaluations.length > 0) {
        const best = result.evaluations[0];
        console.log('');
        console.log(`  \x1b[1m▶ Next move: ${best.action.intent}\x1b[0m`);
        console.log(`    ${best.badukTerm}  |  ΔHealth: ${best.deltaHealth >= 0 ? '+' : ''}${best.deltaHealth.toFixed(2)}`);
        console.log(`    Target: ${best.action.target}`);
      }
      console.log('');
    } catch (err) {
      console.error(`  Error: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

program.parse();
