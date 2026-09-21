import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiService } from '@/services/api.service';
import { ReferralsTab } from '@/app/main/components/profile/ReferralsTab';

jest.mock('@/services/api.service', () => ({ ApiService: { get: jest.fn() } }));
const summary = { referralCode: 'K7M2Q9', shareMessage: 'Join me on Asoose!', invited: 4, pending: 1, credited: 3, totalEarned: 1500 };
beforeEach(() => jest.resetAllMocks());

test('loads the authenticated summary and copies an invitation with a signup link', async () => {
  (ApiService.get as jest.Mock).mockResolvedValue(summary);
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  render(<ReferralsTab token="access-token" />);
  expect(await screen.findByText('K7M2Q9')).toBeInTheDocument();
  expect(ApiService.get).toHaveBeenCalledWith('/referrals/me', 'access-token');
  expect(screen.getByText('₦1,500')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Invite a friend'));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith('Join me on Asoose!\nhttp://localhost/sign-up?referralCode=K7M2Q9'));
  fireEvent.click(screen.getByLabelText('Copy referral code'));
  await waitFor(() => expect(writeText).toHaveBeenLastCalledWith('K7M2Q9'));
});

test('offers retry after an API failure and displays an empty summary', async () => {
  (ApiService.get as jest.Mock).mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValueOnce({ ...summary, invited: 0 });
  render(<ReferralsTab token="token" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Unavailable');
  fireEvent.click(screen.getByText('Try again'));
  expect(await screen.findByText(/Your first invitation/)).toBeInTheDocument();
});
