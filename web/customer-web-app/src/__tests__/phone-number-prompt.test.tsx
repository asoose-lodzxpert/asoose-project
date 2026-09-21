import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { ApiService } from '@/services/api.service';
import { PhoneNumberPrompt } from '@/components/profile/PhoneNumberPrompt';

jest.mock('next-auth/react', () => ({ useSession: jest.fn() }));
jest.mock('next/navigation', () => ({ usePathname: () => '/main/store' }));
jest.mock('@/services/api.service', () => ({ ApiService: { get: jest.fn(), patch: jest.fn() } }));

beforeEach(() => {
  jest.resetAllMocks();
  (useSession as jest.Mock).mockReturnValue({ status: 'authenticated', data: { accessToken: 'token' } });
});

test.each([null, '', '   '])('prompts for missing phone %p and saves the profile', async (phone) => {
  (ApiService.get as jest.Mock).mockResolvedValue({ phone });
  (ApiService.patch as jest.Mock).mockResolvedValue({ phone: '8012345678', phoneVerified: false });
  render(<PhoneNumberPrompt />);
  fireEvent.change(await screen.findByLabelText('Phone number'), { target: { value: '8012345678' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save phone number' }));
  await waitFor(() => expect(ApiService.patch).toHaveBeenCalledWith('/users/me/profile', { phone: '8012345678', phoneCountryCode: '+234' }, 'token'));
  await waitFor(() => expect(screen.queryByText('Add your phone number')).not.toBeInTheDocument());
});

test('a set but unverified phone does not trigger the prompt', async () => {
  (ApiService.get as jest.Mock).mockResolvedValue({ phone: '8012345678', phoneVerified: false });
  render(<PhoneNumberPrompt />);
  await waitFor(() => expect(ApiService.get).toHaveBeenCalledWith('/users/me', 'token'));
  expect(screen.queryByText('Add your phone number')).not.toBeInTheDocument();
});

test('keeps the form and shows a duplicate-number error', async () => {
  (ApiService.get as jest.Mock).mockResolvedValue({ phone: null });
  (ApiService.patch as jest.Mock).mockRejectedValue({ status: 400, message: 'Phone number already in use' });
  render(<PhoneNumberPrompt />);
  fireEvent.change(await screen.findByLabelText('Phone number'), { target: { value: '8012345678' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save phone number' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Phone number already in use');
  expect(screen.getByLabelText('Phone number')).toHaveValue('8012345678');
});

test('failed checks can be retried without assuming a missing phone', async () => {
  (ApiService.get as jest.Mock).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ phone: null });
  render(<PhoneNumberPrompt />);
  fireEvent.click(await screen.findByText('Try again'));
  expect(await screen.findByText('Add your phone number')).toBeInTheDocument();
});

test('does not fetch for guests', () => {
  (useSession as jest.Mock).mockReturnValue({ status: 'unauthenticated', data: null });
  render(<PhoneNumberPrompt />);
  expect(ApiService.get).not.toHaveBeenCalled();
});
