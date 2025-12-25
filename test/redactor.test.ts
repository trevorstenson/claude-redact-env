import { test, describe } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSensitiveFile, redactContent } from '../src/redactor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('isSensitiveFile', () => {
  test('identifies .env files', () => {
    assert.strictEqual(isSensitiveFile('.env'), true);
    assert.strictEqual(isSensitiveFile('/path/to/.env'), true);
    assert.strictEqual(isSensitiveFile('.env.local'), true);
    assert.strictEqual(isSensitiveFile('.env.production'), true);
    assert.strictEqual(isSensitiveFile('/app/.env.development'), true);
  });

  test('identifies key and pem files', () => {
    assert.strictEqual(isSensitiveFile('server.pem'), true);
    assert.strictEqual(isSensitiveFile('private.key'), true);
    assert.strictEqual(isSensitiveFile('/etc/ssl/private.key'), true);
  });

  test('identifies credential files', () => {
    assert.strictEqual(isSensitiveFile('credentials.json'), true);
    assert.strictEqual(isSensitiveFile('secrets.json'), true);
    assert.strictEqual(isSensitiveFile('credentials.yaml'), true);
    assert.strictEqual(isSensitiveFile('credentials.yml'), true);
  });

  test('does not flag regular files', () => {
    assert.strictEqual(isSensitiveFile('package.json'), false);
    assert.strictEqual(isSensitiveFile('README.md'), false);
    assert.strictEqual(isSensitiveFile('index.ts'), false);
    assert.strictEqual(isSensitiveFile('.gitignore'), false);
  });
});

describe('redactContent', () => {
  describe('OpenAI keys', () => {
    test('redacts sk- format keys', () => {
      const input = 'OPENAI_API_KEY=sk-1234567890abcdefghijklmnop';
      const { redacted, findings } = redactContent(input, '.env');
      assert.ok(!redacted.includes('sk-1234'));
      assert.ok(redacted.includes('<REDACTED'));
      assert.ok(findings.length > 0);
    });

    test('redacts sk-proj- format keys', () => {
      const input = 'key=sk-proj-abcdefghijklmnopqrstuvwxyz123456';
      const { redacted } = redactContent(input, '.env');
      assert.ok(!redacted.includes('sk-proj-'));
      assert.ok(redacted.includes('<REDACTED'));
    });
  });

  describe('GitHub tokens', () => {
    test('redacts ghp_ tokens', () => {
      const input = 'GITHUB_TOKEN=ghp_1234567890abcdefghijklmnopqrstuvwxyz';
      const { redacted } = redactContent(input, '.env');
      assert.ok(!redacted.includes('ghp_'));
      assert.ok(redacted.includes('<REDACTED:GITHUB_PAT>'));
    });

    test('redacts gho_ tokens', () => {
      const input = 'token=gho_1234567890abcdefghijklmnopqrstuvwxyz';
      const { redacted } = redactContent(input, '.env');
      assert.ok(!redacted.includes('gho_'));
      assert.ok(redacted.includes('<REDACTED:GITHUB_OAUTH>'));
    });
  });

  describe('AWS keys', () => {
    test('redacts AKIA access keys', () => {
      const input = 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE';
      const { redacted } = redactContent(input, '.env');
      assert.ok(!redacted.includes('AKIAIOSFODNN7EXAMPLE'));
      assert.ok(redacted.includes('<REDACTED:AWS_ACCESS_KEY>'));
    });
  });

  describe('connection strings', () => {
    test('redacts postgres connection strings', () => {
      const input = 'DATABASE_URL=postgres://user:secretpass@localhost:5432/db';
      const { redacted } = redactContent(input, '.env');
      assert.ok(!redacted.includes('secretpass'));
      assert.ok(redacted.includes('<REDACTED>'));
    });

    test('redacts mongodb connection strings', () => {
      const input = 'MONGO_URI=mongodb+srv://admin:password123@cluster.mongodb.net/db';
      const { redacted } = redactContent(input, '.env');
      assert.ok(!redacted.includes('password123'));
      assert.ok(redacted.includes('<REDACTED>'));
    });

    test('redacts mysql connection strings', () => {
      const input = 'DB_URL=mysql://root:mysqlpass@localhost:3306/app';
      const { redacted } = redactContent(input, '.env');
      assert.ok(!redacted.includes('mysqlpass'));
    });

    test('redacts redis connection strings', () => {
      const input = 'REDIS_URL=redis://:redispassword@localhost:6379';
      const { redacted } = redactContent(input, '.env');
      assert.ok(!redacted.includes('redispassword'));
    });
  });

  describe('Stripe keys', () => {
    test('redacts live keys', () => {
      const input = 'STRIPE_KEY=sk_live_1234567890abcdefghijklmn';
      const { redacted } = redactContent(input, '.env');
      assert.ok(!redacted.includes('sk_live_'));
      assert.ok(redacted.includes('<REDACTED:STRIPE_SECRET>'));
    });

    test('redacts test keys', () => {
      const input = 'STRIPE_KEY=sk_test_1234567890abcdefghijklmn';
      const { redacted } = redactContent(input, '.env');
      assert.ok(!redacted.includes('sk_test_'));
      assert.ok(redacted.includes('<REDACTED:STRIPE_TEST>'));
    });
  });

  describe('JWTs', () => {
    test('redacts JWT tokens', () => {
      const input = 'TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const { redacted } = redactContent(input, '.env');
      assert.ok(!redacted.includes('eyJhbGci'));
      assert.ok(redacted.includes('<REDACTED:JWT>'));
    });
  });

  describe('PEM private keys', () => {
    test('redacts RSA private keys', () => {
      const input = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA0Z3VS0Z3VS0Z3VS
more key content here
-----END RSA PRIVATE KEY-----`;
      const { redacted } = redactContent(input, 'key.pem');
      assert.ok(!redacted.includes('MIIEpAIBAAKCAQEA'));
      assert.ok(redacted.includes('<REDACTED>'));
    });

    test('redacts generic private keys', () => {
      const input = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASC
-----END PRIVATE KEY-----`;
      const { redacted } = redactContent(input, 'key.pem');
      assert.ok(!redacted.includes('MIIEvQIBADANBg'));
      assert.ok(redacted.includes('<REDACTED>'));
    });
  });

  describe('generic password patterns', () => {
    test('redacts variables with PASSWORD in name', () => {
      const input = 'DATABASE_PASSWORD=mysuperpassword123';
      const { redacted } = redactContent(input, '.env');
      assert.ok(!redacted.includes('mysuperpassword123'));
      assert.ok(redacted.includes('DATABASE_PASSWORD=<REDACTED>'));
    });

    test('redacts variables with SECRET in name', () => {
      const input = 'API_SECRET=thisisasecretvalue123';
      const { redacted } = redactContent(input, '.env');
      assert.ok(!redacted.includes('thisisasecretvalue123'));
    });

    test('redacts variables with TOKEN in name', () => {
      const input = 'AUTH_TOKEN=someauthenticationtoken';
      const { redacted } = redactContent(input, '.env');
      assert.ok(!redacted.includes('someauthenticationtoken'));
    });
  });

  describe('non-secrets', () => {
    test('preserves DEBUG flag', () => {
      const input = 'DEBUG=true';
      const { redacted, findings } = redactContent(input, '.env');
      assert.strictEqual(redacted, input);
      assert.strictEqual(findings.length, 0);
    });

    test('preserves PORT number', () => {
      const input = 'PORT=3000';
      const { redacted, findings } = redactContent(input, '.env');
      assert.strictEqual(redacted, input);
      assert.strictEqual(findings.length, 0);
    });

    test('preserves NODE_ENV', () => {
      const input = 'NODE_ENV=production';
      const { redacted, findings } = redactContent(input, '.env');
      assert.strictEqual(redacted, input);
      assert.strictEqual(findings.length, 0);
    });

    test('preserves short values even with secret-like names', () => {
      // values less than 8 chars should not be redacted by the generic pattern
      const input = 'API_KEY=short';
      const { redacted } = redactContent(input, '.env');
      assert.strictEqual(redacted, input);
    });
  });

  describe('sample.env fixture', () => {
    test('redacts secrets while preserving non-secrets', () => {
      const samplePath = join(__dirname, 'fixtures', 'sample.env');
      const content = readFileSync(samplePath, 'utf-8');
      const { redacted, findings } = redactContent(content, '.env');

      assert.ok(!redacted.includes('sk-1234567890'));
      assert.ok(!redacted.includes('supersecretpassword123'));
      assert.ok(!redacted.includes('ghp_1234567890'));
      assert.ok(!redacted.includes('AKIAIOSFODNN7EXAMPLE'));
      assert.ok(!redacted.includes('sk_live_1234567890'));
      assert.ok(!redacted.includes('secretpass123'));
      assert.ok(!redacted.includes('password123'));

      // non-secrets should be preserved
      assert.ok(redacted.includes('DEBUG=true'));
      assert.ok(redacted.includes('PORT=3000'));
      assert.ok(redacted.includes('NODE_ENV=development'));
      assert.ok(redacted.includes('LOG_LEVEL=info'));
      assert.ok(redacted.includes('APP_NAME=my-awesome-app'));
      assert.ok(redacted.includes('FEATURE_FLAG_ENABLED=true'));

      assert.ok(findings.length >= 5);
    });
  });
});
