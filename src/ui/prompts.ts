import { select, input, confirm, checkbox, Separator } from '@inquirer/prompts';
import chalk from 'chalk';
import { CommitInfo } from '../core/gitWrapper.js';

export interface MenuChoice<T = string> {
  name: string;
  value: T;
  description?: string;
  disabled?: boolean | string;
}

export async function selectFromList<T>(
  message: string,
  choices: MenuChoice<T>[]
): Promise<T> {
  return select({
    message,
    choices: choices.map(c => ({
      name: c.name,
      value: c.value,
      description: c.description,
      disabled: c.disabled,
    })),
  });
}

export async function selectCommit(
  message: string,
  commits: CommitInfo[]
): Promise<CommitInfo> {
  const choices = commits.map(commit => ({
    name: `${chalk.yellow(commit.hash.substring(0, 7))} ${commit.message.split('\n')[0].substring(0, 50)}`,
    value: commit,
    description: `by ${commit.author}`,
  }));

  return select({
    message,
    choices,
  });
}

export async function selectCommits(
  message: string,
  commits: CommitInfo[]
): Promise<CommitInfo[]> {
  const choices = commits.map(commit => ({
    name: `${chalk.yellow(commit.hash.substring(0, 7))} ${commit.message.split('\n')[0].substring(0, 50)}`,
    value: commit,
  }));

  return checkbox({
    message,
    choices,
  });
}

export async function selectNumber(
  message: string,
  max: number,
  defaultValue: number = 1
): Promise<number> {
  const choices = Array.from({ length: max }, (_, i) => ({
    name: `${i + 1}`,
    value: i + 1,
  }));

  return select({
    message,
    choices,
    default: defaultValue,
  });
}

export async function inputText(
  message: string,
  defaultValue?: string,
  validate?: (value: string) => boolean | string
): Promise<string> {
  return input({
    message,
    default: defaultValue,
    validate,
  });
}

export async function inputBranchName(
  message: string,
  defaultValue?: string
): Promise<string> {
  return input({
    message,
    default: defaultValue,
    validate: (value: string) => {
      if (!value.trim()) {
        return 'Branch name cannot be empty';
      }
      if (!/^[a-zA-Z0-9/_-]+$/.test(value)) {
        return 'Branch name contains invalid characters (use only letters, numbers, /, _, -)';
      }
      return true;
    },
  });
}

export async function confirmAction(
  message: string,
  defaultValue: boolean = false
): Promise<boolean> {
  return confirm({
    message,
    default: defaultValue,
  });
}

export async function selectFiles(
  message: string,
  files: string[]
): Promise<string[]> {
  if (files.length === 0) {
    return [];
  }

  const choices = files.map(file => ({
    name: file,
    value: file,
  }));

  return checkbox({
    message,
    choices,
  });
}

export async function selectResetMode(): Promise<'soft' | 'mixed' | 'hard'> {
  return select({
    message: 'How do you want to handle the changes?',
    choices: [
      {
        name: 'Keep changes staged (soft reset)',
        value: 'soft' as const,
        description: 'Files will remain staged for commit',
      },
      {
        name: 'Keep changes unstaged (mixed reset)',
        value: 'mixed' as const,
        description: 'Files will be modified but unstaged',
      },
      {
        name: 'Discard all changes (hard reset)',
        value: 'hard' as const,
        description: '⚠️ Warning: All changes will be lost',
      },
    ],
  });
}

export async function selectStashAction(): Promise<'push' | 'pop' | 'apply' | 'drop' | 'list' | 'recover'> {
  return select({
    message: 'What would you like to do?',
    choices: [
      { name: 'Create new stash', value: 'push' as const, description: 'Save current changes to stash' },
      { name: 'Pop stash', value: 'pop' as const, description: 'Apply and remove stash' },
      { name: 'Apply stash', value: 'apply' as const, description: 'Apply stash without removing' },
      { name: 'Drop stash', value: 'drop' as const, description: 'Delete a stash' },
      { name: 'List stashes', value: 'list' as const, description: 'Show all stashes' },
      { name: 'Recover dropped stash', value: 'recover' as const, description: 'Find and recover a dropped stash' },
    ],
  });
}

export { Separator };
