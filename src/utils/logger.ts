import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

let currentLevel: LogLevel = 'info';
let verboseMode = false;

const levelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

export function setVerbose(verbose: boolean): void {
  verboseMode = verbose;
  if (verbose) {
    currentLevel = 'debug';
  }
}

function shouldLog(level: LogLevel): boolean {
  return levelPriority[level] >= levelPriority[currentLevel];
}

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    if (shouldLog('debug') && verboseMode) {
      console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
    }
  },

  info(message: string, ...args: unknown[]): void {
    if (shouldLog('info') && verboseMode) {
      console.log(chalk.blue(`[INFO] ${message}`), ...args);
    }
  },

  warn(message: string, ...args: unknown[]): void {
    if (shouldLog('warn')) {
      console.log(chalk.yellow(`[WARN] ${message}`), ...args);
    }
  },

  error(message: string, error?: Error): void {
    if (shouldLog('error')) {
      console.error(chalk.red(`[ERROR] ${message}`));
      if (error && verboseMode) {
        console.error(chalk.red(error.stack || error.message));
      }
    }
  },

  success(message: string): void {
    console.log(chalk.green(`✓ ${message}`));
  },

  step(message: string): void {
    console.log(chalk.cyan(`→ ${message}`));
  },
};
