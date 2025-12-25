# redact-env

Stop accidentally leaking secrets to AI agents.

`redact-env` is a [Claude Code](https://claude.ai/code) hook that automatically redacts sensitive values from `.env` files before the AI can see them.

## The Problem

You're pair programming with Claude, and it reads your `.env` file:

```
OPENAI_API_KEY=sk-proj-abc123...
STRIPE_SECRET_KEY=sk_live_xyz789...
DATABASE_URL=postgres://admin:supersecret@prod.db.com/main
```

Now those secrets are in the conversation context. Not ideal.

## The Solution

```bash
git clone https://github.com/yourname/redact-env
cd redact-env
npm install && npm run build
node dist/cli.js install
```

Now when Claude reads that same file:

```
OPENAI_API_KEY=<REDACTED:OPENAI_KEY>
STRIPE_SECRET_KEY=<REDACTED:STRIPE_SECRET>
DATABASE_URL=postgres://<USER>:<REDACTED>@prod.db.com/main
```

Secrets stay secret. You keep coding.

## Install

```bash
npm install && npm run build
node dist/cli.js install
```

Then **fully quit and restart Claude Code** (Cmd+Q / Ctrl+Q).

> "New session" isn't enough—hooks only load on full restart.

## Uninstall

```bash
node dist/cli.js uninstall
```

## What Gets Protected

**Files:**
- `.env`, `.env.*` (`.env.local`, `.env.production`, etc.)
- `*.pem`, `*.key`
- `credentials.json`, `secrets.yaml`
- `.netrc`, `.pgpass`

**Patterns:**
- OpenAI keys (`sk-...`)
- GitHub tokens (`ghp_...`, `github_pat_...`)
- AWS credentials
- Stripe keys
- Database connection strings
- Generic `PASSWORD=`, `SECRET=`, `API_KEY=` patterns

## How It Works

Installs as a [PreToolUse hook](https://docs.anthropic.com/en/docs/claude-code/hooks) in Claude Code:

1. Hook intercepts `Read` and `Bash` tool calls
2. If target is a sensitive file, creates temp copy with secrets redacted
3. Redirects Claude to read the redacted version
4. Original file untouched

## Run Tests

```bash
npm test
```

## License

MIT
