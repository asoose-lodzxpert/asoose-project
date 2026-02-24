/**
 * E2E Test Setup
 *
 * Loads backend/.env.test and redirects DATABASE_URL to TEST_DATABASE_URL so
 * tests never accidentally run against the production or development database.
 *
 * Create backend/.env.test (gitignored) with:
 *   TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/asoose_test"
 */
import * as path from 'path';

// Load .env.test before anything else so TEST_DATABASE_URL is available
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config({
  path: path.resolve(__dirname, '..', '.env.test'),
});

if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    'TEST_DATABASE_URL is not set. E2E tests require a dedicated test database.\n' +
      'Create backend/.env.test with: TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/asoose_test"',
  );
}

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
