import * as fs from 'fs';
import * as path from 'path';
import { getGitWrapper } from './gitWrapper.js';
import { logger } from '../utils/logger.js';
import { getConfig, getConfigDir } from '../utils/config.js';

export type ActionType =
  | 'undo_commit'
  | 'amend_message'
  | 'amend_commit'
  | 'move_commits'
  | 'recover_branch'
  | 'create_branch'
  | 'squash_commits'
  | 'unstage_files'
  | 'discard_changes'
  | 'clean_untracked'
  | 'abort_operation'
  | 'stash_create'
  | 'stash_apply'
  | 'stash_pop'
  | 'restore_file';

export interface RecordedAction {
  id: string;
  type: ActionType;
  timestamp: string;
  description: string;
  repoPath: string;
  beforeState: {
    headHash: string;
    branch: string | null;
  };
  afterState?: {
    headHash: string;
    branch: string | null;
  };
  undoCommand?: string;
  canUndo: boolean;
}

class ActionHistoryManager {
  private readonly historyFile: string;

  constructor() {
    this.historyFile = path.join(getConfigDir(), 'history.json');
  }

  private loadHistory(): RecordedAction[] {
    try {
      if (fs.existsSync(this.historyFile)) {
        const data = fs.readFileSync(this.historyFile, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      logger.error('Failed to load action history', error as Error);
    }
    return [];
  }

  private saveHistory(actions: RecordedAction[]): void {
    try {
      const config = getConfig();
      const trimmedActions = actions.slice(-config.maxActionHistory);
      fs.writeFileSync(this.historyFile, JSON.stringify(trimmedActions, null, 2));
    } catch (error) {
      logger.error('Failed to save action history', error as Error);
    }
  }

  async recordAction(
    type: ActionType,
    description: string,
    canUndo: boolean = true
  ): Promise<RecordedAction> {
    const git = getGitWrapper();
    const repoPath = process.cwd();

    const action: RecordedAction = {
      id: this.generateId(),
      type,
      timestamp: new Date().toISOString(),
      description,
      repoPath,
      beforeState: {
        headHash: await git.getHeadHash(),
        branch: await git.getCurrentBranch(),
      },
      canUndo,
    };

    const actions = this.loadHistory();
    actions.push(action);
    this.saveHistory(actions);

    logger.debug(`Recorded action: ${type} - ${description}`);
    return action;
  }

  async completeAction(action: RecordedAction): Promise<void> {
    const git = getGitWrapper();

    action.afterState = {
      headHash: await git.getHeadHash(),
      branch: await git.getCurrentBranch(),
    };

    if (action.canUndo && action.beforeState.headHash !== action.afterState.headHash) {
      action.undoCommand = `git reset --hard ${action.beforeState.headHash}`;
    }

    const actions = this.loadHistory();
    const index = actions.findIndex(a => a.id === action.id);
    if (index !== -1) {
      actions[index] = action;
      this.saveHistory(actions);
    }

    logger.debug(`Completed action: ${action.id}`);
  }

  getLastAction(): RecordedAction | null {
    const actions = this.loadHistory();
    return actions[actions.length - 1] || null;
  }

  getLastUndoableAction(): RecordedAction | null {
    const actions = this.loadHistory();
    const repoPath = process.cwd();

    for (let i = actions.length - 1; i >= 0; i--) {
      if (actions[i].canUndo && actions[i].undoCommand && actions[i].repoPath === repoPath) {
        return actions[i];
      }
    }
    return null;
  }

  async undoLastAction(): Promise<{ success: boolean; message: string }> {
    const lastAction = this.getLastUndoableAction();

    if (!lastAction) {
      return { success: false, message: 'No undoable actions in history for this repository' };
    }

    if (!lastAction.beforeState.headHash) {
      return { success: false, message: 'Cannot undo: missing before state' };
    }

    try {
      const git = getGitWrapper();
      await git.hardReset(lastAction.beforeState.headHash);

      const actions = this.loadHistory();
      const index = actions.findIndex(a => a.id === lastAction.id);
      if (index !== -1) {
        actions[index].canUndo = false;
        this.saveHistory(actions);
      }

      logger.debug(`Undid action: ${lastAction.id}`);
      return {
        success: true,
        message: `Undid "${lastAction.description}"`,
      };
    } catch (error) {
      logger.error('Failed to undo action', error as Error);
      return {
        success: false,
        message: `Failed to undo: ${(error as Error).message}`,
      };
    }
  }

  getRecentActions(count: number = 10): RecordedAction[] {
    const actions = this.loadHistory();
    const repoPath = process.cwd();
    return actions
      .filter(a => a.repoPath === repoPath)
      .slice(-count)
      .reverse();
  }

  getAllActions(count: number = 50): RecordedAction[] {
    const actions = this.loadHistory();
    return actions.slice(-count).reverse();
  }

  clearHistory(): void {
    this.saveHistory([]);
    logger.debug('Action history cleared');
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

export const actionHistory = new ActionHistoryManager();
