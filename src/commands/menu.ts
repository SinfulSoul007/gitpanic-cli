import { select, Separator } from '@inquirer/prompts';
import chalk from 'chalk';
import { detectRepoState, RepoState } from '../core/stateDetector.js';
import { actionHistory } from '../core/actionHistory.js';
import { formatError, formatIssue } from '../ui/formatter.js';
import {
  undoCommit,
  fixMessage,
  addFiles,
  squashCommits,
  recoverBranch,
  stashOperations,
  abortOperation,
  unstageFiles,
  discardChanges,
  cleanUntracked,
  recoverFile,
  showHistory,
  undoLastAction,
} from './index.js';

interface MenuItem {
  name: string;
  value: string;
  description?: string;
  disabled?: boolean | string;
}

const gitCommandExplanations: Record<string, string> = {
  'undo': 'git reset --soft/mixed/hard HEAD~N',
  'fix-message': 'git commit --amend -m "new message"',
  'add-files': 'git add <files> && git commit --amend --no-edit',
  'squash': 'git reset --soft HEAD~N && git commit',
  'recover-branch': 'git reflog && git checkout -b <branch> <hash>',
  'stash': 'git stash push/pop/apply/drop',
  'abort': 'git merge/rebase/cherry-pick --abort',
  'unstage': 'git reset HEAD <file>',
  'discard': 'git checkout -- <file>',
  'clean': 'git clean -fd',
  'recover-file': 'git checkout <commit> -- <file>',
};

export async function openMenu(): Promise<void> {
  const state = await detectRepoState();

  if (!state.isGitRepo) {
    console.log(formatError('Not in a Git repository'));
    return;
  }

  // Show header
  console.log(chalk.cyan.bold('\n  Git Panic - What went wrong?\n'));

  // Show issues/warnings first
  if (state.issues.length > 0) {
    for (const issue of state.issues) {
      if (issue.type !== 'info') {
        console.log('  ' + formatIssue(issue));
      }
    }
    console.log();
  }

  // Build menu
  const menuItems = buildMenuItems(state);

  try {
    const choice = await select({
      message: 'Select an action',
      choices: menuItems,
      pageSize: 20,
    });

    if (choice === 'exit') {
      return;
    }

    console.log();
    await executeChoice(choice);
  } catch (error) {
    // User cancelled with Ctrl+C
    if ((error as Error).message?.includes('User force closed')) {
      return;
    }
    throw error;
  }
}

function buildMenuItems(state: RepoState): (MenuItem | Separator)[] {
  const items: (MenuItem | Separator)[] = [];
  const hasCommits = state.lastCommit !== null;
  const lastUndoableAction = actionHistory.getLastUndoableAction();

  // Priority items based on state
  if (state.isDetachedHead) {
    items.push({
      name: `${chalk.yellow('!')} Fix Detached HEAD State`,
      value: 'fix-detached',
      description: 'RECOMMENDED - You are in detached HEAD',
    });
  }

  if (state.ongoingOperation) {
    const conflictText = state.hasConflicts ? ` (${state.conflictedFiles.length} conflicts)` : '';
    items.push({
      name: `${chalk.yellow('!')} Abort/Continue ${state.ongoingOperation}${conflictText}`,
      value: 'abort',
      description: 'RECOMMENDED - Operation in progress',
    });
  }

  if (state.isDetachedHead || state.ongoingOperation) {
    items.push(new Separator());
  }

  // Commit Operations
  items.push(new Separator(chalk.cyan('── Commit Operations ──')));

  items.push({
    name: 'Undo Last Commit(s)',
    value: 'undo',
    description: hasCommits ? state.lastCommit?.message.split('\n')[0].substring(0, 30) : 'No commits',
    disabled: !hasCommits ? 'No commits' : false,
  });

  items.push({
    name: 'Fix Commit Message',
    value: 'fix-message',
    description: gitCommandExplanations['fix-message'],
    disabled: !hasCommits ? 'No commits' : false,
  });

  items.push({
    name: 'Add Files to Last Commit',
    value: 'add-files',
    description: gitCommandExplanations['add-files'],
    disabled: !hasCommits ? 'No commits' : false,
  });

  items.push({
    name: 'Squash Commits',
    value: 'squash',
    description: gitCommandExplanations['squash'],
    disabled: !hasCommits ? 'No commits' : false,
  });

  // Branch Operations
  items.push(new Separator(chalk.cyan('── Branch Operations ──')));

  items.push({
    name: 'Recover Deleted Branch',
    value: 'recover-branch',
    description: gitCommandExplanations['recover-branch'],
  });

  // Staging Operations
  items.push(new Separator(chalk.cyan('── Staging Operations ──')));

  items.push({
    name: 'Unstage Files',
    value: 'unstage',
    description: state.hasStagedChanges ? `${state.status?.staged.length} file(s) staged` : 'No staged files',
    disabled: !state.hasStagedChanges ? 'No staged files' : false,
  });

  items.push({
    name: 'Discard Local Changes',
    value: 'discard',
    description: state.hasUncommittedChanges ? 'Has uncommitted changes' : 'No changes',
    disabled: !state.hasUncommittedChanges ? 'No changes' : false,
  });

  const untrackedCount = state.status?.untracked.length || 0;
  items.push({
    name: 'Clean Untracked Files',
    value: 'clean',
    description: untrackedCount > 0 ? `${untrackedCount} untracked file(s)` : 'No untracked files',
    disabled: untrackedCount === 0 ? 'No untracked files' : false,
  });

  // Recovery Operations
  items.push(new Separator(chalk.cyan('── Recovery Operations ──')));

  if (!state.ongoingOperation) {
    items.push({
      name: 'Abort Merge/Rebase/Cherry-pick',
      value: 'abort',
      description: 'No operation in progress',
      disabled: 'No operation in progress',
    });
  }

  items.push({
    name: 'Recover File from History',
    value: 'recover-file',
    description: gitCommandExplanations['recover-file'],
  });

  items.push({
    name: 'Stash Operations',
    value: 'stash',
    description: state.hasStashes ? `${state.stashCount} stash(es)` : 'No stashes',
  });

  // Meta Operations
  items.push(new Separator());

  items.push({
    name: 'Undo Last GitPanic Action',
    value: 'undo-action',
    description: lastUndoableAction ? `Undo: ${lastUndoableAction.description.substring(0, 30)}` : 'No actions to undo',
    disabled: !lastUndoableAction ? 'No actions to undo' : false,
  });

  items.push({
    name: 'View Action History',
    value: 'history',
    description: 'See all GitPanic actions',
  });

  items.push(new Separator());

  items.push({
    name: chalk.gray('Exit'),
    value: 'exit',
  });

  return items;
}

async function executeChoice(choice: string): Promise<void> {
  switch (choice) {
    case 'undo':
      await undoCommit();
      break;
    case 'fix-message':
      await fixMessage();
      break;
    case 'add-files':
      await addFiles();
      break;
    case 'squash':
      await squashCommits();
      break;
    case 'recover-branch':
      await recoverBranch();
      break;
    case 'stash':
      await stashOperations();
      break;
    case 'abort':
      await abortOperation();
      break;
    case 'unstage':
      await unstageFiles();
      break;
    case 'discard':
      await discardChanges();
      break;
    case 'clean':
      await cleanUntracked();
      break;
    case 'recover-file':
      await recoverFile();
      break;
    case 'history':
      await showHistory();
      break;
    case 'undo-action':
      await undoLastAction();
      break;
    case 'fix-detached':
      // TODO: Implement detached HEAD fix
      console.log(chalk.yellow('Not implemented yet'));
      break;
  }
}
