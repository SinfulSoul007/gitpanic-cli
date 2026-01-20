import chalk from 'chalk';
import { getGitWrapper } from '../core/gitWrapper.js';
import { actionHistory } from '../core/actionHistory.js';
import { selectFromList, confirmAction } from '../ui/prompts.js';
import { formatGitCommand, formatSuccess, formatError } from '../ui/formatter.js';
import { withSpinner } from '../ui/spinner.js';
import { logger } from '../utils/logger.js';

export async function abortOperation(): Promise<void> {
  const git = getGitWrapper();

  // Check if we're in a git repo
  if (!await git.isGitRepo()) {
    console.log(formatError('Not in a Git repository'));
    return;
  }

  // Check for ongoing operation
  const operation = await git.getOngoingOperation();
  if (!operation) {
    console.log(formatError('No ongoing Git operation to abort'));
    return;
  }

  // Check for conflicts
  const conflictedFiles = await git.getConflictedFiles();
  const hasConflicts = conflictedFiles.length > 0;

  console.log(chalk.cyan(`\n⚠️  ${operation.toUpperCase()} in progress\n`));

  if (hasConflicts) {
    console.log(chalk.yellow(`${conflictedFiles.length} file(s) have conflicts:`));
    for (const file of conflictedFiles.slice(0, 5)) {
      console.log(`  ${chalk.red('!')} ${file}`);
    }
    if (conflictedFiles.length > 5) {
      console.log(chalk.gray(`  ... and ${conflictedFiles.length - 5} more`));
    }
    console.log();
  }

  // Select action
  const action = await selectFromList('What would you like to do?', [
    {
      name: `Abort ${operation}`,
      value: 'abort',
      description: `Cancel the ${operation} and restore original state`,
    },
    {
      name: `Continue ${operation}`,
      value: 'continue',
      description: hasConflicts ? 'Resolve conflicts first' : 'Continue with the operation',
      disabled: hasConflicts ? 'Resolve conflicts first' : false,
    },
  ]);

  if (action === 'abort') {
    console.log(chalk.yellow(`\n⚠️  Aborting will discard any merge work done so far`));
    if (!await confirmAction(`Abort ${operation}?`)) {
      console.log(chalk.yellow('Operation cancelled'));
      return;
    }

    const record = await actionHistory.recordAction(
      'abort_operation',
      `Abort ${operation}`
    );

    try {
      await withSpinner(
        `Aborting ${operation}...`,
        async () => {
          switch (operation) {
            case 'merge':
              await git.abortMerge();
              break;
            case 'rebase':
              await git.abortRebase();
              break;
            case 'cherry-pick':
              await git.abortCherryPick();
              break;
          }
        },
        `${operation} aborted successfully`
      );

      await actionHistory.completeAction(record);
      console.log(chalk.gray('\nRepository is back to its original state'));
    } catch (error) {
      logger.error(`Failed to abort ${operation}`, error as Error);
      console.log(formatError(`Failed to abort: ${(error as Error).message}`));
    }
  } else {
    // Continue operation
    if (hasConflicts) {
      console.log(formatError('Cannot continue with unresolved conflicts'));
      return;
    }

    try {
      await withSpinner(
        `Continuing ${operation}...`,
        async () => {
          switch (operation) {
            case 'merge':
              await git.continueMerge();
              break;
            case 'rebase':
              await git.continueRebase();
              break;
            case 'cherry-pick':
              await git.continueCherryPick();
              break;
          }
        },
        `${operation} continued successfully`
      );
    } catch (error) {
      logger.error(`Failed to continue ${operation}`, error as Error);
      console.log(formatError(`Failed to continue: ${(error as Error).message}`));
    }
  }
}
