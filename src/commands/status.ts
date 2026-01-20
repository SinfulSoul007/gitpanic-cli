import { detectRepoState } from '../core/stateDetector.js';
import { formatRepoStatus, formatError } from '../ui/formatter.js';

export async function showStatus(): Promise<void> {
  const state = await detectRepoState();
  console.log(formatRepoStatus(state));
}
