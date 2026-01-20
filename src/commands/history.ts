import chalk from 'chalk';
import { actionHistory, RecordedAction } from '../core/actionHistory.js';
import { confirmAction } from '../ui/prompts.js';
import { formatSuccess, formatError } from '../ui/formatter.js';

export async function showHistory(): Promise<void> {
  const actions = actionHistory.getRecentActions(20);

  if (actions.length === 0) {
    console.log(chalk.gray('\nNo GitPanic actions recorded for this repository\n'));
    return;
  }

  console.log(chalk.cyan('\n📜 GitPanic Action History\n'));

  for (const action of actions) {
    const date = new Date(action.timestamp);
    const timeStr = date.toLocaleString();
    const undoable = action.canUndo && action.undoCommand;

    console.log(
      `${chalk.yellow(action.id.substring(0, 8))} ` +
      `${chalk.white(action.description)} ` +
      `${chalk.gray(timeStr)}` +
      (undoable ? chalk.green(' [undoable]') : '')
    );

    if (action.beforeState && action.afterState) {
      console.log(
        chalk.gray(`  ${action.beforeState.headHash.substring(0, 7)} → ${action.afterState.headHash.substring(0, 7)}`)
      );
    }
  }

  console.log();
}

export async function undoLastAction(): Promise<void> {
  const lastAction = actionHistory.getLastUndoableAction();

  if (!lastAction) {
    console.log(formatError('No undoable actions in history for this repository'));
    return;
  }

  console.log(chalk.cyan('\n🔙 Undo Last GitPanic Action\n'));
  console.log(chalk.white('Last action:'));
  console.log(`  ${chalk.yellow(lastAction.description)}`);
  console.log(`  ${chalk.gray(new Date(lastAction.timestamp).toLocaleString())}`);

  if (lastAction.beforeState && lastAction.afterState) {
    console.log();
    console.log(chalk.white('This will reset to:'));
    console.log(`  ${chalk.yellow(lastAction.beforeState.headHash.substring(0, 7))} on ${lastAction.beforeState.branch || 'detached HEAD'}`);
  }

  console.log();

  if (!await confirmAction('Undo this action?')) {
    console.log(chalk.yellow('Operation cancelled'));
    return;
  }

  const result = await actionHistory.undoLastAction();

  if (result.success) {
    console.log(formatSuccess(result.message));
  } else {
    console.log(formatError(result.message));
  }
}
