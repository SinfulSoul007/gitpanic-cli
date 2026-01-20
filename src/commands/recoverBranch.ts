import chalk from 'chalk';
import { getGitWrapper } from '../core/gitWrapper.js';
import { checkBeforeBranchCreate, showSafetyWarnings } from '../core/safetyChecks.js';
import { actionHistory } from '../core/actionHistory.js';
import { selectFromList, inputBranchName, confirmAction } from '../ui/prompts.js';
import { formatGitCommand, formatSuccess, formatError } from '../ui/formatter.js';
import { withSpinner } from '../ui/spinner.js';
import { logger } from '../utils/logger.js';

export async function recoverBranch(): Promise<void> {
  const git = getGitWrapper();

  // Check if we're in a git repo
  if (!await git.isGitRepo()) {
    console.log(formatError('Not in a Git repository'));
    return;
  }

  console.log(chalk.cyan('\n🔍 Searching for deleted branches in reflog...\n'));

  // Get deleted branches from reflog
  const deletedBranches = await git.getDeletedBranches();

  if (deletedBranches.length === 0) {
    console.log(formatError('No recently deleted branches found in reflog'));
    console.log(chalk.gray('\nTip: The reflog only keeps entries for a limited time.'));
    return;
  }

  // Show found branches
  console.log(chalk.white('Found deleted branches:'));
  for (const branch of deletedBranches) {
    console.log(`  ${chalk.green(branch.name)} ${chalk.gray(`(${branch.hash.substring(0, 7)})`)}`);
  }
  console.log();

  // Select branch to recover
  const choices = deletedBranches.map(b => ({
    name: `${b.name} (${b.hash.substring(0, 7)})`,
    value: b,
  }));

  const selected = await selectFromList('Select a branch to recover:', choices);

  // Ask for branch name (might want to rename)
  const branchName = await inputBranchName(
    'Enter name for the recovered branch:',
    selected.name
  );

  // Safety check
  const safetyResult = await checkBeforeBranchCreate(branchName);
  const proceed = await showSafetyWarnings(safetyResult);
  if (!proceed) {
    console.log(chalk.yellow('Operation cancelled'));
    return;
  }

  // Show what will happen
  console.log();
  console.log(chalk.white(`Recovering branch "${branchName}" from commit ${selected.hash.substring(0, 7)}`));
  console.log(formatGitCommand(`git checkout -b ${branchName} ${selected.hash}`));
  console.log();

  // Confirm
  if (!await confirmAction('Proceed with recovery?')) {
    console.log(chalk.yellow('Operation cancelled'));
    return;
  }

  // Record action
  const action = await actionHistory.recordAction(
    'recover_branch',
    `Recover branch: ${branchName}`,
    false // Can't easily undo branch creation
  );

  try {
    await withSpinner(
      `Recovering branch "${branchName}"...`,
      async () => {
        await git.recoverBranchFromReflog(branchName, selected.hash);
      },
      `Successfully recovered branch "${branchName}"`
    );

    await actionHistory.completeAction(action);

    // Show result
    console.log();
    console.log(chalk.gray(`You are now on branch "${branchName}"`));
  } catch (error) {
    logger.error('Failed to recover branch', error as Error);
    console.log(formatError(`Failed to recover: ${(error as Error).message}`));
  }
}
