import chalk from 'chalk';
import { getGitWrapper } from '../core/gitWrapper.js';
import { actionHistory } from '../core/actionHistory.js';
import { selectStashAction, selectFromList, inputText, confirmAction } from '../ui/prompts.js';
import { formatGitCommand, formatSuccess, formatError } from '../ui/formatter.js';
import { withSpinner } from '../ui/spinner.js';
import { logger } from '../utils/logger.js';

export async function stashOperations(): Promise<void> {
  const git = getGitWrapper();

  // Check if we're in a git repo
  if (!await git.isGitRepo()) {
    console.log(formatError('Not in a Git repository'));
    return;
  }

  const action = await selectStashAction();

  switch (action) {
    case 'push':
      await createStash();
      break;
    case 'pop':
      await popStash();
      break;
    case 'apply':
      await applyStash();
      break;
    case 'drop':
      await dropStash();
      break;
    case 'list':
      await listStashes();
      break;
    case 'recover':
      await recoverStash();
      break;
  }
}

async function createStash(): Promise<void> {
  const git = getGitWrapper();

  const hasChanges = await git.hasUncommittedChanges();
  if (!hasChanges) {
    console.log(formatError('No changes to stash'));
    return;
  }

  const message = await inputText('Enter stash message (optional):');

  const action = await actionHistory.recordAction(
    'stash_create',
    `Create stash${message ? `: ${message}` : ''}`
  );

  try {
    await withSpinner(
      'Creating stash...',
      async () => {
        await git.createStash(message || undefined);
      },
      'Stash created successfully'
    );
    await actionHistory.completeAction(action);
  } catch (error) {
    logger.error('Failed to create stash', error as Error);
    console.log(formatError(`Failed to create stash: ${(error as Error).message}`));
  }
}

async function popStash(): Promise<void> {
  const git = getGitWrapper();

  const stashes = await git.getStashList();
  if (stashes.length === 0) {
    console.log(formatError('No stashes to pop'));
    return;
  }

  console.log(chalk.cyan('\n📦 Available stashes:\n'));

  const choices = stashes.map(s => ({
    name: `stash@{${s.index}}: ${s.message}`,
    value: s.index,
  }));

  const index = await selectFromList('Select stash to pop:', choices);

  const action = await actionHistory.recordAction(
    'stash_pop',
    `Pop stash@{${index}}`
  );

  try {
    await withSpinner(
      `Popping stash@{${index}}...`,
      async () => {
        await git.popStash(index);
      },
      'Stash popped and applied successfully'
    );
    await actionHistory.completeAction(action);
  } catch (error) {
    logger.error('Failed to pop stash', error as Error);
    console.log(formatError(`Failed to pop stash: ${(error as Error).message}`));
  }
}

async function applyStash(): Promise<void> {
  const git = getGitWrapper();

  const stashes = await git.getStashList();
  if (stashes.length === 0) {
    console.log(formatError('No stashes to apply'));
    return;
  }

  console.log(chalk.cyan('\n📦 Available stashes:\n'));

  const choices = stashes.map(s => ({
    name: `stash@{${s.index}}: ${s.message}`,
    value: s.index,
  }));

  const index = await selectFromList('Select stash to apply:', choices);

  const action = await actionHistory.recordAction(
    'stash_apply',
    `Apply stash@{${index}}`
  );

  try {
    await withSpinner(
      `Applying stash@{${index}}...`,
      async () => {
        await git.applyStash(index);
      },
      'Stash applied successfully (stash still exists)'
    );
    await actionHistory.completeAction(action);
  } catch (error) {
    logger.error('Failed to apply stash', error as Error);
    console.log(formatError(`Failed to apply stash: ${(error as Error).message}`));
  }
}

async function dropStash(): Promise<void> {
  const git = getGitWrapper();

  const stashes = await git.getStashList();
  if (stashes.length === 0) {
    console.log(formatError('No stashes to drop'));
    return;
  }

  console.log(chalk.cyan('\n📦 Available stashes:\n'));

  const choices = stashes.map(s => ({
    name: `stash@{${s.index}}: ${s.message}`,
    value: s.index,
  }));

  const index = await selectFromList('Select stash to drop:', choices);

  console.log(chalk.yellow(`\n⚠️  This will permanently delete stash@{${index}}`));
  if (!await confirmAction('Are you sure?')) {
    console.log(chalk.yellow('Operation cancelled'));
    return;
  }

  try {
    await withSpinner(
      `Dropping stash@{${index}}...`,
      async () => {
        await git.dropStash(index);
      },
      'Stash dropped successfully'
    );
  } catch (error) {
    logger.error('Failed to drop stash', error as Error);
    console.log(formatError(`Failed to drop stash: ${(error as Error).message}`));
  }
}

async function listStashes(): Promise<void> {
  const git = getGitWrapper();

  const stashes = await git.getStashList();
  if (stashes.length === 0) {
    console.log(chalk.gray('No stashes'));
    return;
  }

  console.log(chalk.cyan('\n📦 Stash list:\n'));
  for (const stash of stashes) {
    console.log(`  ${chalk.yellow(`stash@{${stash.index}}`)} ${stash.message}`);
    console.log(chalk.gray(`    ${stash.hash.substring(0, 7)}`));
  }
}

async function recoverStash(): Promise<void> {
  const git = getGitWrapper();

  console.log(chalk.cyan('\n🔍 Searching for dropped stashes in reflog...\n'));

  const droppedStashes = await git.getDroppedStashes();
  if (droppedStashes.length === 0) {
    console.log(formatError('No recently dropped stashes found'));
    return;
  }

  const choices = droppedStashes.map((s, i) => ({
    name: `${s.hash.substring(0, 7)}: ${s.message}`,
    value: s.hash,
  }));

  const hash = await selectFromList('Select stash to recover:', choices);

  try {
    await withSpinner(
      'Recovering stash...',
      async () => {
        await git.recoverStash(hash);
      },
      'Stash recovered successfully'
    );
  } catch (error) {
    logger.error('Failed to recover stash', error as Error);
    console.log(formatError(`Failed to recover stash: ${(error as Error).message}`));
  }
}
