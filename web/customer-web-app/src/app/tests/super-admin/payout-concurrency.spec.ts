import { test, expect } from '@playwright/test';

/**
 * TEST: Super-Admin Payout Concurrency (Race Condition)
 * Logic: Two admins click "Approve" on the same payout at the same time.
 * Expected: Only one succeeds; the second receives a 400 error.
 */
test.describe('Payout Concurrency Safety', () => {
  const PAYOUT_ID = 'test-payout-uuid'; // Use a known PENDING ID from your test DB
  const ENDPOINT = `/api/super-admin/payouts/VENDOR/${PAYOUT_ID}/approve`;

  test('should prevent double-disbursement via simultaneous approval', async ({ browser }) => {
    // 1. Create two independent browser contexts (Admin A and Admin B)
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // 2. Setup: Inject Auth Tokens (Simulating signed-in state)
    // In a real test, you'd use a storageState or login helper
    await pageA.goto('/super-admin/payouts');
    await pageB.goto('/super-admin/payouts');

    // 3. Trigger simultaneous POST requests
    // We use Promise.all to fire them as close together as possible
    const [responseA, responseB] = await Promise.all([
      pageA.evaluate(async (url) => {
        const res = await fetch(url, { method: 'POST' });
        return { status: res.status, json: await res.json() };
      }, ENDPOINT),
      pageB.evaluate(async (url) => {
        const res = await fetch(url, { method: 'POST' });
        return { status: res.status, json: await res.json() };
      }, ENDPOINT)
    ]);

    const statuses = [responseA.status, responseB.status];

    // 4. ASSERTIONS
    // Check that exactly one request succeeded (200/201) and one failed (400)
    expect(statuses).toContain(201); 
    expect(statuses).toContain(400); 

    // Verify the error message for the failed request
    const errorResponse = responseA.status === 400 ? responseA : responseB;
    expect(errorResponse.json.message).toMatch(/Payout is already PAID/);

    await contextA.close();
    await contextB.close();
  });
});