# claude-redact-env

A [Claude Code](https://claude.ai/code) hook that stops you from accidentally leaking secrets to the AI. It automatically redacts sensitive values from `.env` files before Claude sees them.

When you ask Claude to "check my config," it reads your `.env` file. Now your API keys and database passwords are in the chat context.

This hook sits in the middle. It intercepts file reads and potentially problematic bash commands, scrubs the secrets, and passes the safe version to Claude.

**Real file:**
```
OPENAI_API_KEY=sk-proj-abc123...
DATABASE_URL=postgres://admin:secret@db.com
```

**What Claude sees:**
```
OPENAI_API_KEY=<REDACTED:OPENAI_KEY>
DATABASE_URL=postgres://<USER>:<REDACTED>@db.com
```

It keeps the general structure intact to convey meaning, but redacts the actual sensitive information.

## Usage

```bash
git clone https://github.com/trevorstenson/claude-redact-env
cd claude-redact-env
npm install && npm run build
node dist/cli.js install
```

## What it Catches

**Files:** `.env*`, `*.pem`, `credentials.json`, `secrets.yaml`, `.netrc`

**Patterns:**
- OpenAI, Stripe, AWS, & GitHub keys
- Database connection strings (scrubs password, keeps the URI)
- Generic `PASSWORD=` or `SECRET=` assignments

## How it Works

It installs a [PreToolUse hook](https://docs.anthropic.com/en/docs/claude-code/hooks). When the agent tries to use `Read` or `Bash` (like `cat .env`), the hook detects the sensitive target, creates a temp file with redacted values, and silently redirects the agent to read that instead. [Read the blog about it here](https://trevo.rs/agent-redaction).

## Uninstall

```bash
node dist/cli.js uninstall
```

