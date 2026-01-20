import chalk from 'chalk';
import { getGitWrapper } from '../core/gitWrapper.js';
import { confirmDangerousAction } from '../core/safetyChecks.js';
import { actionHistory } from '../core/actionHistory.js';
import { selectFiles, selectFromList, confirmAction } from '../ui/prompts.js';
import { formatGitCommand, formatSuccess, formatError, formatFileList } from '../ui/formatter.js';
import { withSpinner } from '../ui/spinner.js';
import { logger } from '../utils/logger.js';

export async function cleanUntracked(): Promise<void> {
  const git = getGitWrapper();

  // Check if we're in a git repo
  if (!await git.isGitRepo()) {
    console.log(formatError('Not in a Git repository'));
    return;
  }

  const untrackedFiles = await git.getUntrackedFiles();
  if (untrackedFiles.length === 0) {
    console.log(formatError('No untracked files to clean'));
    return;
  }

  console.log(chalk.cyan('\n📋 Untracked files:\n'));
  console.log(formatFileList(untrackedFiles));
  console.log();

  // Show what would be removed with dry run
  const wouldRemove = await git.cleanDryRun();
  if (wouldRemove.length > 0) {
    console.log(chalk.yellow('Would remove:'));
    console.log(formatFileList(wouldRemove));
    console.log();
  }

  // Ask what to clean
  const choice = await selectFromList('What would you like to clean?', [
    { name: 'All untracked files', value: 'all', description: '⚠️ This cannot be undone' },
    { name: 'Select specific files', value: 'select' },
  ]);

  let filesToClean: string[] = [];

  if (choice === 'all') {
    filesToClean = untrackedFiles;
  } else {
    filesToClean = await selectFiles('Select files to clean:', untrackedFiles);
    if (filesToClean.length === 0) {
      console.log(chalk.yellow('No files selected'));
      return;
    }
  }

  // Show what will happen
  console.log();
  console.log(chalk.white('Files to delete:'));
  console.log(formatFileList(filesToClean));
  console.log(formatGitCommand('git clean -fd'));
  console.log();

  // Safety confirmation
  const confirmed = await confirmDangerousAction(
    'Clean Untracked Files',
    `This will permanently delete ${filesToClean.length} untracked file(s).`,
    ['This cannot be undone!', 'Files are not tracked by git and cannot be recovered.']
  );

  if (!confirmed) {
    console.log(chalk.yellow('Operation cancelled'));
    return;
  }

  const action = await actionHistory.recordAction(
    'clean_untracked',
    `Clean ${filesToClean.length} untracked file(s)`,
    false // Cannot undo
  );

  try {
    await withSpinner(
      `Cleaning ${filesToClean.length} file(s)...`,
      async () => {
        if (choice === 'all') {
          await git.cleanUntrackedFiles();
        } else {
          await git.cleanUntrackedFiles(filesToClean);
        }
      },
      `Successfully cleaned ${filesToClean.length} file(s)`
    );

    await actionHistory.completeAction(action);
  } catch (error) {
    logger.error('Failed to clean untracked files', error as Error);
    console.log(formatError(`Failed to clean: ${(error as Error).message}`));
  }
}
