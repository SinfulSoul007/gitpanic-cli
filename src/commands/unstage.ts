import chalk from 'chalk';
import { getGitWrapper } from '../core/gitWrapper.js';
import { actionHistory } from '../core/actionHistory.js';
import { selectFiles, selectFromList, confirmAction } from '../ui/prompts.js';
import { formatGitCommand, formatSuccess, formatError, formatFileList } from '../ui/formatter.js';
import { withSpinner } from '../ui/spinner.js';
import { logger } from '../utils/logger.js';

export async function unstageFiles(): Promise<void> {
  const git = getGitWrapper();

  // Check if we're in a git repo
  if (!await git.isGitRepo()) {
    console.log(formatError('Not in a Git repository'));
    return;
  }

  const status = await git.getStatus();
  if (status.staged.length === 0) {
    console.log(formatError('No staged files to unstage'));
    return;
  }

  console.log(chalk.cyan('\n📋 Staged files:\n'));
  console.log(formatFileList(status.staged));
  console.log();

  // Ask what to unstage
  const choice = await selectFromList('What would you like to unstage?', [
    { name: 'All staged files', value: 'all' },
    { name: 'Select specific files', value: 'select' },
  ]);

  let filesToUnstage: string[] = [];

  if (choice === 'all') {
    filesToUnstage = status.staged;
  } else {
    filesToUnstage = await selectFiles('Select files to unstage:', status.staged);
    if (filesToUnstage.length === 0) {
      console.log(chalk.yellow('No files selected'));
      return;
    }
  }

  // Show what will happen
  console.log();
  console.log(chalk.white('Files to unstage:'));
  console.log(formatFileList(filesToUnstage));
  console.log(formatGitCommand('git reset HEAD <files>'));
  console.log();

  // Confirm
  if (!await confirmAction('Proceed with unstage?')) {
    console.log(chalk.yellow('Operation cancelled'));
    return;
  }

  const action = await actionHistory.recordAction(
    'unstage_files',
    `Unstage ${filesToUnstage.length} file(s)`,
    false
  );

  try {
    await withSpinner(
      `Unstaging ${filesToUnstage.length} file(s)...`,
      async () => {
        if (choice === 'all') {
          await git.unstageAll();
        } else {
          for (const file of filesToUnstage) {
            await git.unstageFile(file);
          }
        }
      },
      `Successfully unstaged ${filesToUnstage.length} file(s)`
    );

    await actionHistory.completeAction(action);
    console.log(chalk.gray('\nFiles are now modified but unstaged'));
  } catch (error) {
    logger.error('Failed to unstage files', error as Error);
    console.log(formatError(`Failed to unstage: ${(error as Error).message}`));
  }
}
