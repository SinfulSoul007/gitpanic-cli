import chalk from 'chalk';
import { getGitWrapper } from '../core/gitWrapper.js';
import { checkBeforeAmend, showSafetyWarnings } from '../core/safetyChecks.js';
import { actionHistory } from '../core/actionHistory.js';
import { inputText, confirmAction } from '../ui/prompts.js';
import { formatGitCommand, formatSuccess, formatError } from '../ui/formatter.js';
import { withSpinner } from '../ui/spinner.js';
import { logger } from '../utils/logger.js';

export async function fixMessage(newMessage?: string): Promise<void> {
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

  console.log(chalk.cyan('\n📝 Current commit:\n'));
  console.log(`  ${chalk.yellow(lastCommit.hash.substring(0, 7))} ${lastCommit.message}`);
  console.log(chalk.gray(`  by ${lastCommit.author}`));
  console.log();

  // Safety check
  const safetyResult = await checkBeforeAmend();
  const proceed = await showSafetyWarnings(safetyResult);
  if (!proceed) {
    console.log(chalk.yellow('Operation cancelled'));
    return;
  }

  // Get new message
  const message = newMessage || await inputText(
    'Enter new commit message:',
    lastCommit.message.split('\n')[0],
    (value: string) => {
      if (!value.trim()) {
        return 'Commit message cannot be empty';
      }
      return true;
    }
  );

  if (message === lastCommit.message) {
    console.log(chalk.yellow('Message unchanged, nothing to do'));
    return;
  }

  // Show what will happen
  console.log();
  console.log(chalk.white('Changing commit message:'));
  console.log(chalk.red(`  - ${lastCommit.message.split('\n')[0]}`));
  console.log(chalk.green(`  + ${message}`));
  console.log(formatGitCommand(`git commit --amend -m "${message}"`));
  console.log();

  // Confirm
  if (!await confirmAction('Proceed with amend?')) {
    console.log(chalk.yellow('Operation cancelled'));
    return;
  }

  // Record action
  const action = await actionHistory.recordAction(
    'amend_message',
    `Fix commit message: "${message.substring(0, 30)}..."`
  );

  try {
    await withSpinner(
      'Amending commit message...',
      async () => {
        await git.amendCommitMessage(message);
      },
      'Successfully amended commit message'
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
    logger.error('Failed to amend commit message', error as Error);
    console.log(formatError(`Failed to amend: ${(error as Error).message}`));
  }
}
