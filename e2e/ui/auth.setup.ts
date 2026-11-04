import { expect, test as setup } from '@playwright/test';
import { ADMIN } from '../fixtures';

/** Signs the supervisor in once; supervisor.spec.ts reuses the saved cookie. */
setup('sesi supervisor', async ({ request }) => {
  const res = await request.post('/api/auth/login', { data: ADMIN });
  expect(res.ok()).toBe(true);
  await request.storageState({ path: 'e2e/.auth/supervisor.json' });
});
