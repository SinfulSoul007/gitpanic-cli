import chalk from 'chalk';
import { getGitWrapper } from '../core/gitWrapper.js';
import { checkBeforeReset, showSafetyWarnings } from '../core/safetyChecks.js';
import { actionHistory } from '../core/actionHistory.js';
import { selectNumber, inputText, confirmAction } from '../ui/prompts.js';
import { formatCommitList, formatGitCommand, formatSuccess, formatError } from '../ui/formatter.js';
import { withSpinner } from '../ui/spinner.js';
import { logger } from '../utils/logger.js';

export async function squashCommits(count?: number): Promise<void> {
  const git = getGitWrapper();

  // Check if we're in a git repo
  if (!await git.isGitRepo()) {
    console.log(formatError('Not in a Git repository'));
    return;
  }

  // Get recent commits
  const commits = await git.getRecentCommits(10);
  if (commits.length < 2) {
    console.log(formatError('Need at least 2 commits to squash'));
    return;
  }

  console.log(chalk.cyan('\n📋 Recent commits:\n'));
  console.log(formatCommitList(commits.slice(0, 8)));
  console.log();

  // Get number of commits to squash
  const commitCount = count || await selectNumber(
    'How many commits do you want to squash?',
    Math.min(commits.length, 10),
    2
  );

  if (commitCount < 2) {
    console.log(formatError('Need to select at least 2 commits to squash'));
    return;
  }

  // Safety check
  const safetyResult = await checkBeforeReset('soft', commitCount);
  const proceed = await showSafetyWarnings(safetyResult);
  if (!proceed) {
    console.log(chalk.yellow('Operation cancelled'));
    return;
  }

  // Show commits being squashed
  console.log(chalk.white('\nCommits to squash:'));
  for (let i = 0; i < commitCount; i++) {
    console.log(`  ${chalk.yellow(commits[i].hash.substring(0, 7))} ${commits[i].message.split('\n')[0]}`);
  }
  console.log();

  // Build suggested message from commit messages
  const suggestedMessage = commits
    .slice(0, commitCount)
    .map(c => `- ${c.message.split('\n')[0]}`)
    .join('\n');

  // Get new commit message
  const message = await inputText(
    'Enter message for the squashed commit:',
    commits[0].message.split('\n')[0],
    (value: string) => {
      if (!value.trim()) {
        return 'Commit message cannot be empty';
      }
      return true;
    }
  );

  // Show what will happen
  console.log();
  console.log(chalk.white(`Squashing ${commitCount} commits into one`));
  console.log(formatGitCommand(`git reset --soft HEAD~${commitCount} && git commit -m "${message}"`));
  console.log();

  // Confirm
  if (!await confirmAction('Proceed with squash?')) {
    console.log(chalk.yellow('Operation cancelled'));
    return;
  }

  // Record action
  const action = await actionHistory.recordAction(
    'squash_commits',
    `Squash ${commitCount} commits into: "${message.substring(0, 30)}..."`
  );

  try {
    await withSpinner(
      `Squashing ${commitCount} commits...`,
      async () => {
        await git.squashCommits(commitCount, message);
      },
      `Successfully squashed ${commitCount} commits`
    );

    await actionHistory.completeAction(action);

    // Show result
    console.log();
    const newCommit = await git.getLastCommit();
    if (newCommit) {
      console.log(chalk.white('New commit:'));
      console.log(`  ${chalk.yellow(newCommit.hash.substring(0, 7))} ${newCommit.message.split('\n')[0]}`);
    }
  } catch (error) {
    logger.error('Failed to squash commits', error as Error);
    console.log(formatError(`Failed to squash: ${(error as Error).message}`));
  }
}
