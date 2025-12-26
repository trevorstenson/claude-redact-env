/**
 * claude-redact-env PreToolUse hook
 *
 * This script runs on every PreToolUse event for Read and Bash tools.
 * It intercepts file reads, creates redacted copies, and rewrites the tool input
 * so the agent sees the redacted version.
 */

import { existsSync } from 'node:fs';
import type { HookInput, ReadToolInput, BashToolInput } from './types.js';
import { SENSITIVE_FILE_PATTERNS, FILE_READ_COMMANDS } from './patterns.js';
import { isSensitiveFile, createRedactedFile } from './redactor.js';

function extractSensitiveFilePath(command: string): string | null {
  for (const pattern of SENSITIVE_FILE_PATTERNS) {
    const source = pattern.source.replace(/[$^]/g, '');
    const regex = new RegExp(`[\\w./-]*${source}`, 'gi');
    const matches = command.match(regex);
    if (matches) {
      for (const match of matches) {
        if (existsSync(match)) {
          return match;
        }
      }
      return matches[0];
    }
  }
  return null;
}

function isFileReadCommand(command: string): boolean {
  return FILE_READ_COMMANDS.some(cmd => {
    const patterns = [
      new RegExp(`^${cmd}\\s`),
      new RegExp(`\\|\\s*${cmd}\\s`),
      new RegExp(`;\\s*${cmd}\\s`),
      new RegExp(`&&\\s*${cmd}\\s`),
    ];
    return patterns.some(p => p.test(command));
  });
}

function handleReadTool(input: HookInput): object | null {
  const toolInput = input.tool_input as ReadToolInput;
  const filePath = toolInput.file_path;

  if (!filePath || !isSensitiveFile(filePath)) {
    return null;
  }

  const redactedPath = createRedactedFile(filePath);
  if (!redactedPath) {
    return null;
  }

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason: `Redirecting to redacted version of ${filePath}`,
      updatedInput: {
        file_path: redactedPath,
      },
    },
  };
}

function handleBashTool(input: HookInput): object | null {
  const toolInput = input.tool_input as BashToolInput;
  const command = toolInput.command;

  if (!command || !isFileReadCommand(command)) {
    return null;
  }

  const filePath = extractSensitiveFilePath(command);
  if (!filePath || !isSensitiveFile(filePath)) {
    return null;
  }

  const redactedPath = createRedactedFile(filePath);
  if (!redactedPath) {
    return null;
  }

  const newCommand = command.replace(filePath, redactedPath);
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason: `Redirecting to redacted version of ${filePath}`,
      updatedInput: {
        command: newCommand,
      },
    },
  };
}

function handleToolUse(input: HookInput): object | null {
  const toolName = input.tool_name;

  if (toolName === 'Read') {
    return handleReadTool(input);
  }

  if (toolName === 'Bash') {
    return handleBashTool(input);
  }

  return null;
}

async function main(): Promise<void> {
  let inputData = '';

  process.stdin.setEncoding('utf-8');

  for await (const chunk of process.stdin) {
    inputData += chunk;
  }

  try {
    const input = JSON.parse(inputData) as HookInput;
    const output = handleToolUse(input);

    if (output) {
      console.log(JSON.stringify(output));
    }
    process.exit(0);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[claude-redact-env] Error: ${message}`);
    process.exit(0);
  }
}

main();
