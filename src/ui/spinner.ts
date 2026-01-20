import ora, { Ora } from 'ora';

let currentSpinner: Ora | null = null;

export function startSpinner(text: string): Ora {
  if (currentSpinner) {
    currentSpinner.stop();
  }
  currentSpinner = ora(text).start();
  return currentSpinner;
}

export function succeedSpinner(text?: string): void {
  if (currentSpinner) {
    currentSpinner.succeed(text);
    currentSpinner = null;
  }
}

export function failSpinner(text?: string): void {
  if (currentSpinner) {
    currentSpinner.fail(text);
    currentSpinner = null;
  }
}

export function stopSpinner(): void {
  if (currentSpinner) {
    currentSpinner.stop();
    currentSpinner = null;
  }
}

export function updateSpinner(text: string): void {
  if (currentSpinner) {
    currentSpinner.text = text;
  }
}

export async function withSpinner<T>(
  text: string,
  action: () => Promise<T>,
  successText?: string,
  failText?: string
): Promise<T> {
  const spinner = startSpinner(text);
  try {
    const result = await action();
    spinner.succeed(successText || text);
    return result;
  } catch (error) {
    spinner.fail(failText || `Failed: ${(error as Error).message}`);
    throw error;
  }
}
