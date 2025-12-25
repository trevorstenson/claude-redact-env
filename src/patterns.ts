import type { SecretPattern } from './types.js';

// file patterns that should be redacted. will probably grow.
export const SENSITIVE_FILE_PATTERNS: RegExp[] = [
  /\.env$/,
  /\.env\..+$/,           // .env.local, .env.production, etc.
  /\.pem$/,
  /\.key$/,
  /credentials\.json$/,
  /credentials\.ya?ml$/,
  /secrets\.json$/,
  /secrets\.ya?ml$/,
  /\.netrc$/,
  /\.pgpass$/,
];

/**
 * patterns that indicate a secret value in file content
 *
 * important: specific patterns (like sk_live_, ghp_) must come before
 * the generic KEY=value pattern, otherwise the generic pattern will
 * match first and replace the whole line.
 */
export const SECRET_PATTERNS: SecretPattern[] = [
  // ============================================
  // specific api key patterns (must come first)
  // ============================================

  // openai api keys
  { regex: /sk-proj-[a-zA-Z0-9-_]{20,}/g, replace: '<REDACTED:OPENAI_PROJECT_KEY>' },
  { regex: /sk-[a-zA-Z0-9]{20,}/g, replace: '<REDACTED:OPENAI_KEY>' },

  // github tokens
  { regex: /ghp_[a-zA-Z0-9]{36}/g, replace: '<REDACTED:GITHUB_PAT>' },
  { regex: /gho_[a-zA-Z0-9]{36}/g, replace: '<REDACTED:GITHUB_OAUTH>' },
  { regex: /github_pat_[a-zA-Z0-9_]{22,}/g, replace: '<REDACTED:GITHUB_PAT>' },
  { regex: /ghs_[a-zA-Z0-9]{36}/g, replace: '<REDACTED:GITHUB_APP>' },
  { regex: /ghu_[a-zA-Z0-9]{36}/g, replace: '<REDACTED:GITHUB_USER>' },

  // aws keys
  { regex: /AKIA[0-9A-Z]{16}/g, replace: '<REDACTED:AWS_ACCESS_KEY>' },

  // slack tokens
  { regex: /xox[baprs]-[0-9a-zA-Z-]+/g, replace: '<REDACTED:SLACK_TOKEN>' },

  // stripe keys
  { regex: /sk_live_[a-zA-Z0-9]{24,}/g, replace: '<REDACTED:STRIPE_SECRET>' },
  { regex: /sk_test_[a-zA-Z0-9]{24,}/g, replace: '<REDACTED:STRIPE_TEST>' },
  { regex: /rk_live_[a-zA-Z0-9]{24,}/g, replace: '<REDACTED:STRIPE_RESTRICTED>' },
  { regex: /rk_test_[a-zA-Z0-9]{24,}/g, replace: '<REDACTED:STRIPE_RESTRICTED_TEST>' },

  // square tokens
  { regex: /sq0[a-z]{3}-[a-zA-Z0-9-_]{22,}/g, replace: '<REDACTED:SQUARE_TOKEN>' },

  // twilio
  { regex: /SK[a-f0-9]{32}/g, replace: '<REDACTED:TWILIO_API_KEY>' },

  // sendgrid
  { regex: /SG\.[a-zA-Z0-9_-]{22,}\.[a-zA-Z0-9_-]{22,}/g, replace: '<REDACTED:SENDGRID_KEY>' },

  // jwts (eyJ... format)
  { regex: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, replace: '<REDACTED:JWT>' },

  // ============================================
  // connection strings
  // ============================================

  { regex: /(mongodb(\+srv)?:\/\/)[^:]+:[^@]+@/gi, replace: '$1<USER>:<REDACTED>@' },
  { regex: /(postgres(ql)?:\/\/)[^:]+:[^@]+@/gi, replace: '$1<USER>:<REDACTED>@' },
  { regex: /(mysql:\/\/)[^:]+:[^@]+@/gi, replace: '$1<USER>:<REDACTED>@' },
  { regex: /(redis:\/\/)[^:]*:[^@]+@/gi, replace: '$1<REDACTED>@' },
  { regex: /(amqp:\/\/)[^:]+:[^@]+@/gi, replace: '$1<USER>:<REDACTED>@' },

  // ============================================
  // private keys (pem format)
  // ============================================

  {
    regex: /-----BEGIN (RSA |EC |DSA |OPENSSH |ENCRYPTED |)PRIVATE KEY-----[\s\S]*?-----END \1PRIVATE KEY-----/g,
    replace: '-----BEGIN PRIVATE KEY-----\n<REDACTED>\n-----END PRIVATE KEY-----'
  },

  // ============================================
  // generic patterns (must come last)
  // ============================================

  // generic KEY=value patterns (catches anything not matched above)
  // matches: API_KEY=xxx, SECRET_TOKEN=xxx, DATABASE_PASSWORD=xxx, etc.
  // uses negative lookahead (?!<REDACTED) to skip already-redacted values
  {
    regex: /^([A-Z][A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL|AUTH|PWD|PASS)[A-Z0-9_]*)\s*=\s*["']?(?!<REDACTED)(.{8,})["']?$/gim,
    replace: '$1=<REDACTED>'
  },

  // high-entropy strings in common secret contexts (be conservative)
  {
    regex: /["'][a-zA-Z0-9+/=_-]{40,}["']/g,
    replace: '"<REDACTED:HIGH_ENTROPY>"',
    fileTypes: ['.env', '.json', '.yaml', '.yml']
  },
];

/**
 * commands that read files (for bash tool interception)
 */
export const FILE_READ_COMMANDS = [
  'cat',
  'head',
  'tail',
  'less',
  'more',
  'grep',
  'awk',
  'sed',
  'bat',
  'rg',
];
