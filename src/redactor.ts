import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import type { RedactionResult } from './types.js';
import { SENSITIVE_FILE_PATTERNS, SECRET_PATTERNS } from './patterns.js';

/**
 * check if a file path matches any sensitive file patterns
 */
export function isSensitiveFile(filePath: string): boolean {
  const normalizedPath = filePath.toLowerCase();
  return SENSITIVE_FILE_PATTERNS.some(pattern => pattern.test(normalizedPath));
}

/**
 * apply redaction patterns to content
 */
export function redactContent(content: string, filePath?: string): RedactionResult {
  let redacted = content;
  const findings: string[] = [];

  for (const pattern of SECRET_PATTERNS) {
    // skip patterns that are file-type specific and don't match
    if (pattern.fileTypes && filePath) {
      const matchesFileType = pattern.fileTypes.some(ft => filePath.includes(ft));
      if (!matchesFileType) {
        continue;
      }
    }

    // reset regex lastIndex for global patterns
    pattern.regex.lastIndex = 0;

    const matches = content.match(pattern.regex);
    if (matches) {
      for (const match of matches) {
        // truncate for logging
        const preview = match.length > 20 ? match.substring(0, 20) + '...' : match;
        findings.push(preview);
      }
      pattern.regex.lastIndex = 0;
      redacted = redacted.replace(pattern.regex, pattern.replace);
    }
  }

  return { redacted, findings };
}

/**
 * create a redacted copy of a file in /tmp
 * returns the temp file path, or null if no redaction was needed or file doesn't exist
 */
export function createRedactedFile(originalPath: string): string | null {
  try {
    if (!existsSync(originalPath)) {
      return null;
    }

    const content = readFileSync(originalPath, 'utf-8');
    const { redacted, findings } = redactContent(content, originalPath);

    if (findings.length === 0) {
      return null;
    }

    // create deterministic temp path based on original path, allows caching
    const hash = createHash('md5').update(originalPath).digest('hex').slice(0, 12);
    const tempPath = join(tmpdir(), `redacted-${hash}-${basename(originalPath)}`);

    writeFileSync(tempPath, redacted);

    return tempPath;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[claude-redact-env] Error processing ${originalPath}: ${message}`);
    return null;
  }
}
