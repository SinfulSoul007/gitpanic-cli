import chalk from 'chalk';
import { getGitWrapper } from '../core/gitWrapper.js';
import { checkBeforeReset, showSafetyWarnings } from '../core/safetyChecks.js';
import { actionHistory } from '../core/actionHistory.js';
import { selectNumber, selectResetMode, confirmAction } from '../ui/prompts.js';
import { formatCommitList, formatGitCommand, formatSuccess, formatError } from '../ui/formatter.js';
import { withSpinner } from '../ui/spinner.js';
import { logger } from '../utils/logger.js';

export async function undoCommit(count?: number): Promise<void> {
  const git = getGitWrapper();

  // Check if we're in a git repo
  if (!await git.isGitRepo()) {
    console.log(formatError('Not in a Git repository'));
    return;
  }

  // Get recent commits
  const commits = await git.getRecentCommits(10);
  if (commits.length === 0) {
    console.log(formatError('No commits to undo'));
    return;
  }

  console.log(chalk.cyan('\n📋 Recent commits:\n'));
  console.log(formatCommitList(commits.slice(0, 5)));
  console.log();

  // Get number of commits to undo
  const commitCount = count || await selectNumber(
    'How many commits do you want to undo?',
    Math.min(commits.length, 10),
    1
  );

  // Select reset mode
  const mode = await selectResetMode();

  // Safety check
  const safetyResult = await checkBeforeReset(mode, commitCount);
  const proceed = await showSafetyWarnings(safetyResult);
  if (!proceed) {
    console.log(chalk.yellow('Operation cancelled'));
    return;
  }

  // Show what will happen
  console.log();
  console.log(chalk.white(`Undoing ${commitCount} commit(s) with ${mode} reset`));
  console.log(formatGitCommand(`git reset --${mode} HEAD~${commitCount}`));
  console.log();

  // Confirm
  if (!await confirmAction('Proceed with undo?')) {
    console.log(chalk.yellow('Operation cancelled'));
    return;
  }

  // Record action
  const action = await actionHistory.recordAction(
    'undo_commit',
    `Undo ${commitCount} commit(s) with ${mode} reset`
  );

  try {
    await withSpinner(
      `Undoing ${commitCount} commit(s)...`,
      async () => {
        switch (mode) {
          case 'soft':
            await git.softReset(`HEAD~${commitCount}`);
            break;
          case 'mixed':
            await git.mixedReset(`HEAD~${commitCount}`);
            break;
          case 'hard':
            await git.hardReset(`HEAD~${commitCount}`);
            break;
        }
      },
      `Successfully undid ${commitCount} commit(s)`
    );

    await actionHistory.completeAction(action);

    // Show result
    console.log();
    const newCommit = await git.getLastCommit();
    if (newCommit) {
      console.log(chalk.white('New HEAD:'));
      console.log(`  ${chalk.yellow(newCommit.hash.substring(0, 7))} ${newCommit.message.split('\n')[0]}`);
    }

    // Hint based on mode
    if (mode === 'soft') {
      console.log(chalk.gray('\nYour changes are staged and ready to commit.'));
    } else if (mode === 'mixed') {
      console.log(chalk.gray('\nYour changes are preserved but unstaged.'));
    } else {
      console.log(chalk.gray('\nAll changes from those commits have been discarded.'));
    }
  } catch (error) {
    logger.error('Failed to undo commit', error as Error);
    console.log(formatError(`Failed to undo: ${(error as Error).message}`));
  }
}
