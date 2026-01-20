import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface GitPanicConfig {
  confirmDangerousActions: boolean;
  maxActionHistory: number;
  verbose: boolean;
}

const defaultConfig: GitPanicConfig = {
  confirmDangerousActions: true,
  maxActionHistory: 50,
  verbose: false,
};

const CONFIG_DIR = path.join(os.homedir(), '.gitpanic');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function getConfig(): GitPanicConfig {
  try {
    ensureConfigDir();
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return { ...defaultConfig, ...JSON.parse(data) };
    }
  } catch {
    // Return defaults on error
  }
  return { ...defaultConfig };
}

export function saveConfig(config: Partial<GitPanicConfig>): void {
  try {
    ensureConfigDir();
    const current = getConfig();
    const updated = { ...current, ...config };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2));
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}

export function getConfigDir(): string {
  ensureConfigDir();
  return CONFIG_DIR;
}
