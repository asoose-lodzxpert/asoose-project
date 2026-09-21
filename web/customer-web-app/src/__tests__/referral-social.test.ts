/** @jest-environment node */
import { authOptions } from '../../utils/authOptions';
import { cookies } from 'next/headers';

jest.mock('next/headers', () => ({ cookies: jest.fn() }));

test.each(['K7M2Q9', undefined])('social signup forwards optional referral %p and clears it', async (code) => {
  const set = jest.fn();
  (cookies as jest.Mock).mockResolvedValue({ get: () => code ? { value: code } : undefined, set });
  const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { accessToken: 'access', user: { id: 'user', role: 'CUSTOMER' } } }) } as Response);
  try {
    const result = await authOptions.callbacks!.signIn!({ user: { id: 'google-user' }, account: { provider: 'google', id_token: 'google-token', type: 'oauth', providerAccountId: 'google-user' } });
    expect(result).toBe(true);
    const body = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
    expect(body).toEqual({ provider: 'google', idToken: 'google-token', ...(code ? { referralCode: code } : {}) });
    expect(set).toHaveBeenCalledWith('asoose_referral', '', { path: '/api/auth', maxAge: 0 });
  } finally {
    fetchMock.mockRestore();
  }
});
