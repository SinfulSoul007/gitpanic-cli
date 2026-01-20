#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { setVerbose } from './utils/logger.js';
import { openMenu } from './commands/menu.js';
import {
  undoCommit,
  fixMessage,
  addFiles,
  squashCommits,
  recoverBranch,
  stashOperations,
  abortOperation,
  unstageFiles,
  discardChanges,
  cleanUntracked,
  recoverFile,
  showStatus,
  showHistory,
  undoLastAction,
} from './commands/index.js';

const program = new Command();

program
  .name('gitpanic')
  .description('Big friendly buttons for common Git disasters')
  .version('0.1.0')
  .option('-v, --verbose', 'Enable verbose output')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.verbose) {
      setVerbose(true);
    }
  });

// Default command - open menu
program
  .command('menu', { isDefault: true })
  .description('Open the interactive panic menu')
  .action(async () => {
    await openMenu();
  });

// Commit operations
program
  .command('undo [count]')
  .description('Undo last N commits (default: 1)')
  .action(async (count?: string) => {
    await undoCommit(count ? parseInt(count, 10) : undefined);
  });

program
  .command('fix-message [message]')
  .alias('amend-message')
  .description('Fix the last commit message')
  .action(async (message?: string) => {
    await fixMessage(message);
  });

program
  .command('add-files')
  .alias('amend')
  .description('Add files to the last commit')
  .action(async () => {
    await addFiles();
  });

program
  .command('squash [count]')
  .description('Squash N commits into one (default: 2)')
  .action(async (count?: string) => {
    await squashCommits(count ? parseInt(count, 10) : undefined);
  });

// Branch operations
program
  .command('recover-branch')
  .alias('rb')
  .description('Recover a deleted branch from reflog')
  .action(async () => {
    await recoverBranch();
  });

// Staging operations
program
  .command('unstage')
  .description('Unstage files')
  .action(async () => {
    await unstageFiles();
  });

program
  .command('discard')
  .description('Discard local changes')
  .action(async () => {
    await discardChanges();
  });

program
  .command('clean')
  .description('Clean untracked files')
  .action(async () => {
    await cleanUntracked();
  });

// Recovery operations
program
  .command('abort')
  .description('Abort ongoing merge/rebase/cherry-pick')
  .action(async () => {
    await abortOperation();
  });

program
  .command('recover-file')
  .alias('rf')
  .description('Recover a file from history')
  .action(async () => {
    await recoverFile();
  });

program
  .command('stash')
  .description('Stash operations (create, pop, apply, drop)')
  .action(async () => {
    await stashOperations();
  });

// Status and history
program
  .command('status')
  .alias('s')
  .description('Show repository status with issues')
  .action(async () => {
    await showStatus();
  });

program
  .command('history')
  .alias('h')
  .description('Show GitPanic action history')
  .action(async () => {
    await showHistory();
  });

program
  .command('undo-action')
  .description('Undo the last GitPanic action')
  .action(async () => {
    await undoLastAction();
  });

// Error handling
program.exitOverride();

async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    if ((error as Error).message?.includes('commander.help')) {
      process.exit(0);
    }
    if ((error as Error).message?.includes('commander.version')) {
      process.exit(0);
    }
    if ((error as Error).message?.includes('User force closed')) {
      console.log(chalk.gray('\nCancelled'));
      process.exit(0);
    }
    console.error(chalk.red(`Error: ${(error as Error).message}`));
    process.exit(1);
  }
}

main();
