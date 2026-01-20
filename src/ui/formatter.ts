import chalk from 'chalk';
import { RepoState, RepoIssue } from '../core/stateDetector.js';
import { CommitInfo } from '../core/gitWrapper.js';

export function formatHeader(title: string): string {
  const line = '─'.repeat(50);
  return `\n${chalk.cyan(line)}\n${chalk.cyan.bold(`  ${title}`)}\n${chalk.cyan(line)}\n`;
}

export function formatSubHeader(title: string): string {
  return `\n${chalk.white.bold(title)}\n${'─'.repeat(title.length)}`;
}

export function formatCommit(commit: CommitInfo, index?: number): string {
  const prefix = index !== undefined ? chalk.gray(`${index + 1}. `) : '';
  const hash = chalk.yellow(commit.hash.substring(0, 7));
  const message = commit.message.split('\n')[0].substring(0, 50);
  const author = chalk.gray(`(${commit.author})`);
  return `${prefix}${hash} ${message} ${author}`;
}

export function formatCommitList(commits: CommitInfo[]): string {
  return commits.map((c, i) => formatCommit(c, i)).join('\n');
}

export function formatGitCommand(command: string): string {
  return chalk.gray(`  Git: ${command}`);
}

export function formatSuccess(message: string): string {
  return chalk.green(`✓ ${message}`);
}

export function formatError(message: string): string {
  return chalk.red(`✗ ${message}`);
}

export function formatWarning(message: string): string {
  return chalk.yellow(`⚠ ${message}`);
}

export function formatInfo(message: string): string {
  return chalk.blue(`ℹ ${message}`);
}

export function formatIssue(issue: RepoIssue): string {
  const icon = issue.type === 'error' ? chalk.red('✗') :
               issue.type === 'warning' ? chalk.yellow('⚠') :
               chalk.blue('ℹ');
  const message = issue.type === 'error' ? chalk.red(issue.message) :
                  issue.type === 'warning' ? chalk.yellow(issue.message) :
                  chalk.white(issue.message);
  const suggestion = issue.suggestion ? chalk.gray(`  → ${issue.suggestion}`) : '';
  return `${icon} ${message}${suggestion ? '\n' + suggestion : ''}`;
}

export function formatRepoStatus(state: RepoState): string {
  const lines: string[] = [];

  lines.push(formatHeader('Repository Status'));

  if (!state.isGitRepo) {
    lines.push(formatError('Not a Git repository'));
    return lines.join('\n');
  }

  // Branch info
  const branchIcon = state.isDetachedHead ? chalk.yellow('⚠') : chalk.green('⎇');
  const branchName = state.isDetachedHead ?
    chalk.yellow('DETACHED HEAD') :
    chalk.green(state.currentBranch || 'unknown');
  lines.push(`${branchIcon} Branch: ${branchName}`);

  // Last commit
  if (state.lastCommit) {
    const hash = chalk.yellow(state.lastCommit.hash.substring(0, 7));
    const msg = state.lastCommit.message.split('\n')[0].substring(0, 40);
    lines.push(`  Last commit: ${hash} ${msg}`);
  }

  // Status
  if (state.status) {
    if (state.status.staged.length > 0) {
      lines.push(chalk.green(`  ● ${state.status.staged.length} staged`));
    }
    if (state.status.modified.length > 0) {
      lines.push(chalk.yellow(`  ● ${state.status.modified.length} modified`));
    }
    if (state.status.untracked.length > 0) {
      lines.push(chalk.gray(`  ● ${state.status.untracked.length} untracked`));
    }
    if (state.status.ahead > 0) {
      lines.push(chalk.cyan(`  ↑ ${state.status.ahead} ahead`));
    }
    if (state.status.behind > 0) {
      lines.push(chalk.magenta(`  ↓ ${state.status.behind} behind`));
    }
  }

  // Ongoing operation
  if (state.ongoingOperation) {
    lines.push(chalk.yellow(`\n⚠ ${state.ongoingOperation.toUpperCase()} in progress`));
    if (state.hasConflicts) {
      lines.push(chalk.red(`  ${state.conflictedFiles.length} file(s) with conflicts`));
    }
  }

  // Stashes
  if (state.hasStashes) {
    lines.push(chalk.gray(`\n📦 ${state.stashCount} stash(es)`));
  }

  // Issues
  if (state.issues.length > 0) {
    lines.push(formatSubHeader('Issues'));
    for (const issue of state.issues) {
      lines.push(formatIssue(issue));
    }
  }

  return lines.join('\n');
}

export function formatFileList(files: string[], maxShow: number = 10): string {
  if (files.length === 0) {
    return chalk.gray('  (none)');
  }

  const shown = files.slice(0, maxShow);
  const lines = shown.map(f => `  ${chalk.white(f)}`);

  if (files.length > maxShow) {
    lines.push(chalk.gray(`  ... and ${files.length - maxShow} more`));
  }

  return lines.join('\n');
}

export function formatDiff(diff: string, maxLines: number = 20): string {
  if (!diff) {
    return chalk.gray('No changes');
  }

  const lines = diff.split('\n').slice(0, maxLines);
  return lines.map(line => {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      return chalk.green(line);
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      return chalk.red(line);
    } else if (line.startsWith('@@')) {
      return chalk.cyan(line);
    }
    return chalk.gray(line);
  }).join('\n');
}

export function formatTable(headers: string[], rows: string[][]): string {
  const colWidths = headers.map((h, i) => {
    const maxRowWidth = Math.max(...rows.map(r => (r[i] || '').length));
    return Math.max(h.length, maxRowWidth);
  });

  const headerRow = headers.map((h, i) => h.padEnd(colWidths[i])).join('  ');
  const separator = colWidths.map(w => '─'.repeat(w)).join('──');
  const dataRows = rows.map(row =>
    row.map((cell, i) => (cell || '').padEnd(colWidths[i])).join('  ')
  );

  return [
    chalk.bold(headerRow),
    chalk.gray(separator),
    ...dataRows
  ].join('\n');
}
