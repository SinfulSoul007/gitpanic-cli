import chalk from 'chalk';
import { getGitWrapper } from '../core/gitWrapper.js';
import { checkBeforeAmend, showSafetyWarnings } from '../core/safetyChecks.js';
import { actionHistory } from '../core/actionHistory.js';
import { selectFiles, confirmAction } from '../ui/prompts.js';
import { formatGitCommand, formatSuccess, formatError, formatFileList } from '../ui/formatter.js';
import { withSpinner } from '../ui/spinner.js';
import { logger } from '../utils/logger.js';

export async function addFiles(): Promise<void> {
  const git = getGitWrapper();

  // Check if we're in a git repo
  if (!await git.isGitRepo()) {
    console.log(formatError('Not in a Git repository'));
    return;
  }

  // Get last commit
  const lastCommit = await git.getLastCommit();
  if (!lastCommit) {
    console.log(formatError('No commits to amend'));
    return;
  }

  // Get status
  const status = await git.getStatus();
  const hasChanges = status.staged.length > 0 || status.modified.length > 0 || status.untracked.length > 0;

  if (!hasChanges) {
    console.log(formatError('No changes to add to the last commit'));
    return;
  }

  console.log(chalk.cyan('\n📝 Last commit:\n'));
  console.log(`  ${chalk.yellow(lastCommit.hash.substring(0, 7))} ${lastCommit.message.split('\n')[0]}`);
  console.log();

  // Show current status
  if (status.staged.length > 0) {
    console.log(chalk.green('Staged changes:'));
    console.log(formatFileList(status.staged));
    console.log();
  }

  if (status.modified.length > 0) {
    console.log(chalk.yellow('Modified files:'));
    console.log(formatFileList(status.modified));
    console.log();
  }

  if (status.untracked.length > 0) {
    console.log(chalk.gray('Untracked files:'));
    console.log(formatFileList(status.untracked));
    console.log();
  }

  // Safety check
  const safetyResult = await checkBeforeAmend();
  const proceed = await showSafetyWarnings(safetyResult);
  if (!proceed) {
    console.log(chalk.yellow('Operation cancelled'));
    return;
  }

  // Select files to add if not already staged
  let filesToAdd: string[] = [];
  const unstaged = [...status.modified, ...status.untracked];

  if (unstaged.length > 0 && status.staged.length === 0) {
    filesToAdd = await selectFiles('Select files to add to the last commit:', unstaged);
    if (filesToAdd.length === 0) {
      console.log(chalk.yellow('No files selected'));
      return;
    }
  }

  // Show what will happen
  console.log();
  console.log(chalk.white('Adding files to the last commit:'));
  const allFiles = [...status.staged, ...filesToAdd];
  console.log(formatFileList(allFiles));
  console.log(formatGitCommand('git add <files> && git commit --amend --no-edit'));
  console.log();

  // Confirm
  if (!await confirmAction('Add these files to the last commit?')) {
    console.log(chalk.yellow('Operation cancelled'));
    return;
  }

  // Record action
  const action = await actionHistory.recordAction(
    'amend_commit',
    `Add ${allFiles.length} file(s) to last commit`
  );

  try {
    await withSpinner(
      'Adding files to last commit...',
      async () => {
        if (filesToAdd.length > 0) {
          await git.stageFiles(filesToAdd);
        }
        await git.amendCommit();
      },
      'Successfully added files to last commit'
    );

    await actionHistory.completeAction(action);

    // Show result
    console.log();
    const newCommit = await git.getLastCommit();
    if (newCommit) {
      console.log(chalk.white('Updated commit:'));
      console.log(`  ${chalk.yellow(newCommit.hash.substring(0, 7))} ${newCommit.message.split('\n')[0]}`);
    }
  } catch (error) {
    logger.error('Failed to add files to commit', error as Error);
    console.log(formatError(`Failed to add files: ${(error as Error).message}`));
  }
}
