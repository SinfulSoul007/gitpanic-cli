import chalk from 'chalk';
import { getGitWrapper } from '../core/gitWrapper.js';
import { actionHistory } from '../core/actionHistory.js';
import { selectFromList, selectCommit, inputText, confirmAction } from '../ui/prompts.js';
import { formatCommitList, formatGitCommand, formatSuccess, formatError } from '../ui/formatter.js';
import { withSpinner } from '../ui/spinner.js';
import { logger } from '../utils/logger.js';

export async function recoverFile(): Promise<void> {
  const git = getGitWrapper();

  // Check if we're in a git repo
  if (!await git.isGitRepo()) {
    console.log(formatError('Not in a Git repository'));
    return;
  }

  const choice = await selectFromList('What would you like to recover?', [
    { name: 'Restore a deleted file', value: 'deleted', description: 'Recover a file that was deleted in a commit' },
    { name: 'Restore a file to a previous version', value: 'version', description: 'Revert a file to how it was in a specific commit' },
  ]);

  if (choice === 'deleted') {
    await recoverDeletedFile();
  } else {
    await recoverFileVersion();
  }
}

async function recoverDeletedFile(): Promise<void> {
  const git = getGitWrapper();

  console.log(chalk.cyan('\n🔍 Searching for deleted files...\n'));

  const deletedFiles = await git.getDeletedFiles(30);
  if (deletedFiles.length === 0) {
    console.log(formatError('No deleted files found in recent history'));
    return;
  }

  // Group by file path
  const uniqueFiles = new Map<string, { path: string; hash: string; message: string }>();
  for (const file of deletedFiles) {
    if (!uniqueFiles.has(file.path)) {
      uniqueFiles.set(file.path, file);
    }
  }

  console.log(chalk.white('Deleted files found:'));
  const choices = Array.from(uniqueFiles.values()).map(f => ({
    name: `${f.path} ${chalk.gray(`(deleted in ${f.hash.substring(0, 7)})`)}`,
    value: f,
    description: f.message.substring(0, 40),
  }));

  const selected = await selectFromList('Select file to recover:', choices);

  // Show what will happen
  console.log();
  console.log(chalk.white(`Recovering "${selected.path}" from commit ${selected.hash.substring(0, 7)}`));
  // Need to restore from the commit BEFORE the one that deleted it
  console.log(formatGitCommand(`git checkout ${selected.hash}^ -- ${selected.path}`));
  console.log();

  if (!await confirmAction('Proceed with recovery?')) {
    console.log(chalk.yellow('Operation cancelled'));
    return;
  }

  const action = await actionHistory.recordAction(
    'restore_file',
    `Recover deleted file: ${selected.path}`,
    false
  );

  try {
    await withSpinner(
      `Recovering ${selected.path}...`,
      async () => {
        // Restore from the parent commit (^) of the commit that deleted it
        await git.restoreFile(selected.path, `${selected.hash}^`);
      },
      `Successfully recovered ${selected.path}`
    );

    await actionHistory.completeAction(action);
    console.log(chalk.gray('\nFile has been restored to your working directory (unstaged)'));
  } catch (error) {
    logger.error('Failed to recover file', error as Error);
    console.log(formatError(`Failed to recover: ${(error as Error).message}`));
  }
}

async function recoverFileVersion(): Promise<void> {
  const git = getGitWrapper();

  // Get file path
  const filePath = await inputText(
    'Enter file path to restore:',
    undefined,
    (value: string) => {
      if (!value.trim()) {
        return 'File path cannot be empty';
      }
      return true;
    }
  );

  // Get file history
  console.log(chalk.cyan(`\n🔍 Getting history for ${filePath}...\n`));

  const history = await git.getFileHistory(filePath, 20);
  if (history.length === 0) {
    console.log(formatError('No history found for this file'));
    return;
  }

  console.log(chalk.white('File history:'));
  console.log(formatCommitList(history.slice(0, 10)));
  console.log();

  // Select commit
  const commit = await selectCommit('Select version to restore:', history);

  // Show preview if possible
  console.log(chalk.cyan('\nPreview:'));
  const fileContent = await git.getFileAtCommit(filePath, commit.hash);
  if (fileContent) {
    const lines = fileContent.split('\n').slice(0, 10);
    for (const line of lines) {
      console.log(chalk.gray(`  ${line}`));
    }
    if (fileContent.split('\n').length > 10) {
      console.log(chalk.gray('  ...'));
    }
  }
  console.log();

  // Show what will happen
  console.log(chalk.white(`Restoring "${filePath}" from commit ${commit.hash.substring(0, 7)}`));
  console.log(formatGitCommand(`git checkout ${commit.hash} -- ${filePath}`));
  console.log();

  if (!await confirmAction('Proceed with restore?')) {
    console.log(chalk.yellow('Operation cancelled'));
    return;
  }

  const action = await actionHistory.recordAction(
    'restore_file',
    `Restore ${filePath} to version ${commit.hash.substring(0, 7)}`,
    false
  );

  try {
    await withSpinner(
      `Restoring ${filePath}...`,
      async () => {
        await git.restoreFile(filePath, commit.hash);
      },
      `Successfully restored ${filePath}`
    );

    await actionHistory.completeAction(action);
    console.log(chalk.gray('\nFile has been restored (staged for commit)'));
  } catch (error) {
    logger.error('Failed to restore file', error as Error);
    console.log(formatError(`Failed to restore: ${(error as Error).message}`));
  }
}
