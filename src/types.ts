/**
 * TypeScript interfaces for Claude Code hook I/O
 */

/**
 * The JSON structure Claude Code passes to PreToolUse hooks
 */
export interface HookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
}

export interface ReadToolInput {
  file_path: string;
  offset?: number;
  limit?: number;
}

export interface BashToolInput {
  command: string;
  timeout?: number;
}

export interface SecretPattern {
  // regular expression to match secret values
  regex: RegExp;
  // replacement string (can include capture groups like $1)
  replace: string;
  // optional: only apply this pattern to specific file types
  fileTypes?: string[];
}

export interface RedactionResult {
  // the redacted content
  redacted: string;
  // summary of what was found (for logging)
  findings: string[];
}
