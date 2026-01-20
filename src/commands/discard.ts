import chalk from 'chalk';
import { getGitWrapper } from '../core/gitWrapper.js';
import { confirmDangerousAction } from '../core/safetyChecks.js';
import { actionHistory } from '../core/actionHistory.js';
import { selectFiles, selectFromList, confirmAction } from '../ui/prompts.js';
import { formatGitCommand, formatSuccess, formatError, formatFileList } from '../ui/formatter.js';
import { withSpinner } from '../ui/spinner.js';
import { logger } from '../utils/logger.js';

export async function discardChanges(): Promise<void> {
  const git = getGitWrapper();

  // Check if we're in a git repo
  if (!await git.isGitRepo()) {
    console.log(formatError('Not in a Git repository'));
    return;
  }

  const status = await git.getStatus();
  const hasChanges = status.modified.length > 0;

  if (!hasChanges) {
    console.log(formatError('No changes to discard'));
    return;
  }

  console.log(chalk.cyan('\n📋 Modified files:\n'));
  console.log(formatFileList(status.modified));
  console.log();

  // Ask what to discard
  const choice = await selectFromList('What would you like to discard?', [
    { name: 'All changes', value: 'all', description: '⚠️ This cannot be undone' },
    { name: 'Select specific files', value: 'select' },
  ]);

  let filesToDiscard: string[] = [];

  if (choice === 'all') {
    filesToDiscard = status.modified;
  } else {
    filesToDiscard = await selectFiles('Select files to discard:', status.modified);
    if (filesToDiscard.length === 0) {
      console.log(chalk.yellow('No files selected'));
      return;
    }
  }

  // Show what will happen
  console.log();
  console.log(chalk.white('Files to discard:'));
  console.log(formatFileList(filesToDiscard));
  console.log(formatGitCommand('git checkout -- <files>'));
  console.log();

  // Safety confirmation
  const confirmed = await confirmDangerousAction(
    'Discard Changes',
    `This will permanently discard changes in ${filesToDiscard.length} file(s).`,
    ['This cannot be undone!', 'Your changes will be lost forever.']
  );

  if (!confirmed) {
    console.log(chalk.yellow('Operation cancelled'));
    return;
  }

  const action = await actionHistory.recordAction(
    'discard_changes',
    `Discard changes in ${filesToDiscard.length} file(s)`,
    false // Cannot undo
  );

  try {
    await withSpinner(
      `Discarding changes in ${filesToDiscard.length} file(s)...`,
      async () => {
        if (choice === 'all') {
          await git.discardAllChanges();
        } else {
          for (const file of filesToDiscard) {
            await git.discardFileChanges(file);
          }
        }
      },
      `Successfully discarded changes in ${filesToDiscard.length} file(s)`
    );

    await actionHistory.completeAction(action);
  } catch (error) {
    logger.error('Failed to discard changes', error as Error);
    console.log(formatError(`Failed to discard: ${(error as Error).message}`));
  }
}
