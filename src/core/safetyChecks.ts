import { confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { getGitWrapper } from './gitWrapper.js';
import { getConfig } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export interface SafetyCheckResult {
  safe: boolean;
  warnings: string[];
  blockers: string[];
}

export async function checkBeforeReset(
  mode: 'soft' | 'mixed' | 'hard',
  commitCount: number = 1
): Promise<SafetyCheckResult> {
  const git = getGitWrapper();
  const warnings: string[] = [];
  const blockers: string[] = [];

  const commits = await git.getRecentCommits(commitCount);
  if (commits.length < commitCount) {
    blockers.push(`Only ${commits.length} commits available, cannot undo ${commitCount}`);
  }

  if (mode === 'hard') {
    const hasChanges = await git.hasUncommittedChanges();
    if (hasChanges) {
      warnings.push('Hard reset will discard all uncommitted changes');
    }
  }

  for (const commit of commits) {
    const isPushed = await git.isPushed(commit.hash);
    if (isPushed) {
      warnings.push(
        `Commit "${commit.message.substring(0, 50)}" has been pushed. Undoing will require force push.`
      );
    }
  }

  return {
    safe: blockers.length === 0,
    warnings,
    blockers,
  };
}

export async function checkBeforeAmend(): Promise<SafetyCheckResult> {
  const git = getGitWrapper();
  const warnings: string[] = [];
  const blockers: string[] = [];

  const lastCommit = await git.getLastCommit();
  if (!lastCommit) {
    blockers.push('No commits to amend');
    return { safe: false, warnings, blockers };
  }

  const isPushed = await git.isPushed(lastCommit.hash);
  if (isPushed) {
    warnings.push('This commit has been pushed. Amending will require a force push.');
  }

  return {
    safe: blockers.length === 0,
    warnings,
    blockers,
  };
}

export async function checkBeforeBranchCreate(branchName: string): Promise<SafetyCheckResult> {
  const git = getGitWrapper();
  const warnings: string[] = [];
  const blockers: string[] = [];

  const branches = await git.getBranches();
  if (branches.all.includes(branchName)) {
    blockers.push(`Branch "${branchName}" already exists`);
  }

  if (!/^[a-zA-Z0-9/_-]+$/.test(branchName)) {
    blockers.push('Branch name contains invalid characters');
  }

  return {
    safe: blockers.length === 0,
    warnings,
    blockers,
  };
}

export async function confirmDangerousAction(
  actionName: string,
  details: string,
  warnings: string[] = []
): Promise<boolean> {
  const config = getConfig();

  if (!config.confirmDangerousActions) {
    return true;
  }

  console.log();
  console.log(chalk.yellow.bold(`⚠️  ${actionName}`));
  console.log(chalk.white(details));

  if (warnings.length > 0) {
    console.log();
    console.log(chalk.yellow('Warnings:'));
    for (const warning of warnings) {
      console.log(chalk.yellow(`  • ${warning}`));
    }
  }
  console.log();

  const confirmed = await confirm({
    message: 'Do you want to proceed?',
    default: false,
  });

  logger.debug(`Dangerous action "${actionName}" ${confirmed ? 'confirmed' : 'cancelled'}`);
  return confirmed;
}

export async function showSafetyWarnings(result: SafetyCheckResult): Promise<boolean> {
  if (!result.safe) {
    console.log();
    console.log(chalk.red.bold('Cannot proceed:'));
    for (const blocker of result.blockers) {
      console.log(chalk.red(`  ✗ ${blocker}`));
    }
    return false;
  }

  if (result.warnings.length > 0) {
    console.log();
    console.log(chalk.yellow.bold('⚠️  Warnings:'));
    for (const warning of result.warnings) {
      console.log(chalk.yellow(`  • ${warning}`));
    }
    console.log();

    const proceed = await confirm({
      message: 'Continue anyway?',
      default: false,
    });
    return proceed;
  }

  return true;
}
