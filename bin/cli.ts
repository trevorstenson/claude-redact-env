/**
 * claude-redact-env CLI
 *
 * Usage:
 *   claude-redact-env install    - Install hooks into Claude Code
 *   claude-redact-env uninstall  - Remove hooks from Claude Code
 */

import { install, uninstall } from '../src/installer.js';

const command = process.argv[2];

function showHelp(): void {
  console.log(`
claude-redact-env - Automatic secret redaction for Claude Code

Usage:
  claude-redact-env install     Install hooks into Claude Code
  claude-redact-env uninstall   Remove hooks from Claude Code
  claude-redact-env --help      Show this help message

When installed, claude-redact-env will automatically redact secrets from:
  • .env files (.env, .env.local, .env.production, etc.)
  • Private keys (*.pem, *.key)
  • Credential files (credentials.json, secrets.yaml)
  • Other sensitive files (.netrc, .pgpass)

The agent will see redacted values like <REDACTED> instead of actual secrets.
`);
}

switch (command) {
  case 'install':
    install();
    break;
  case 'uninstall':
    uninstall();
    break;
  case '--help':
  case '-h':
  case 'help':
    showHelp();
    break;
  default:
    if (command) {
      console.error(`Unknown command: ${command}\n`);
    }
    showHelp();
    process.exit(command ? 1 : 0);
}
