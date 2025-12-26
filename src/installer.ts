import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  unlinkSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CLAUDE_DIR = join(homedir(), '.claude');
const SETTINGS_PATH = join(CLAUDE_DIR, 'settings.json');
const HOOKS_DIR = join(CLAUDE_DIR, 'hooks');

interface HookConfig {
  type: string;
  command: string;
}

interface HookMatcher {
  matcher: string;
  hooks: HookConfig[];
}

interface ClaudeSettings {
  hooks?: {
    PreToolUse?: HookMatcher[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export function install(): void {
  console.log('Installing redact-env...\n');

  const hookSource = join(__dirname, 'hook.js');
  if (!existsSync(hookSource)) {
    console.error('Error: hook.js not found. Run `npm run build` first.');
    process.exit(1);
  }

  mkdirSync(HOOKS_DIR, { recursive: true });
  const hookDest = join(HOOKS_DIR, 'redact-env.js');
  copyFileSync(hookSource, hookDest);
  console.log(`Copied hook to ${hookDest}`);

  let config: ClaudeSettings = {};
  if (existsSync(SETTINGS_PATH)) {
    try {
      config = JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'));
    } catch {
      console.log('Could not parse settings.json, creating new one');
    }
  }

  config.hooks = config.hooks || {};
  config.hooks.PreToolUse = config.hooks.PreToolUse || [];

  const hookCommand = `${process.execPath} ${hookDest}`;

  const alreadyInstalled = config.hooks.PreToolUse.some(h =>
    h.hooks?.some(hh => hh.command?.includes('redact-env'))
  );

  if (alreadyInstalled) {
    console.log('Hook already configured');
  } else {
    config.hooks.PreToolUse.push({
      matcher: 'Read',
      hooks: [{ type: 'command', command: hookCommand }]
    });

    config.hooks.PreToolUse.push({
      matcher: 'Bash',
      hooks: [{ type: 'command', command: hookCommand }]
    });

    writeFileSync(SETTINGS_PATH, JSON.stringify(config, null, 2));
    console.log(`Updated ${SETTINGS_PATH}`);
  }

  console.log('\nInstalled.');
  console.log('\nFully quit and restart Claude Code.');
}

export function uninstall(): void {
  console.log('Uninstalling redact-env...\n');

  if (existsSync(SETTINGS_PATH)) {
    try {
      const config: ClaudeSettings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'));

      if (config.hooks?.PreToolUse) {
        config.hooks.PreToolUse = config.hooks.PreToolUse.filter(h =>
          !h.hooks?.some(hh => hh.command?.includes('redact-env'))
        );

        if (config.hooks.PreToolUse.length === 0) delete config.hooks.PreToolUse;
        if (Object.keys(config.hooks).length === 0) delete config.hooks;

        writeFileSync(SETTINGS_PATH, JSON.stringify(config, null, 2));
        console.log(`Removed from ${SETTINGS_PATH}`);
      }
    } catch {
      console.log('Could not update settings.json');
    }
  }

  const hookPath = join(HOOKS_DIR, 'redact-env.js');
  if (existsSync(hookPath)) {
    unlinkSync(hookPath);
    console.log(`Removed ${hookPath}`);
  }

  console.log('\nUninstalled.');
}
