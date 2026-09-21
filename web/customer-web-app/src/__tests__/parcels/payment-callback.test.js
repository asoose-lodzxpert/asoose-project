import { render, waitFor } from '@testing-library/react';
import PaymentCallbackPage from '@/app/payment/callback/page';
import { DeliveryService } from '@/services/delivery.service';
const mockReplace = jest.fn();
const mockReset = jest.fn();
const mockParams = new URLSearchParams('reference=test-ref');
const mockSession = { accessToken: 'token', user: { id: 'user' } };
jest.mock('next/navigation', () => ({ useSearchParams: () => mockParams, useRouter: () => ({ replace: mockReplace }) }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: mockSession, status: 'authenticated' }) }));
jest.mock('@/store/useDeliveryStore', () => ({ useDeliveryStore: Object.assign(() => ({ resetDelivery: mockReset }), { persist: { rehydrate: jest.fn() } }) }));
jest.mock('@/store/useCartStore', () => ({ useCartStore: Object.assign(() => ({ clearCart: jest.fn() }), { persist: { rehydrate: jest.fn() } }) }));
jest.mock('@/app/main/ride/store/ride', () => ({ useRideStore: () => jest.fn() }));
jest.mock('@/services/ride.service', () => ({ RideService: {} }));
jest.mock('@/services/delivery.service', () => ({ DeliveryService: { verifyPayment: jest.fn() } }));
jest.mock('@/lib/meta-pixel', () => ({ clearPurchaseContext: jest.fn(), trackVerifiedPurchase: jest.fn() }));
jest.mock('react-toastify', () => ({ toast: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
beforeEach(() => {
  jest.clearAllMocks(); localStorage.clear();
  mockParams.delete('status');
  localStorage.setItem('pending_delivery_data', JSON.stringify({ id: 'existing-parcel' }));
  global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify({ success: true }) });
});
test('a successful callback response without verified payment never claims dispatch', async () => {
  DeliveryService.verifyPayment.mockResolvedValue(false);
  render(<PaymentCallbackPage />);
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/main/delivery/existing-parcel'));
  expect(mockReset).not.toHaveBeenCalled();
  expect(DeliveryService.verifyPayment).toHaveBeenCalledWith('test-ref', 'PAYSTACK', 'token');
});
test('confirmed payment returns to parcel tracking, which determines scheduled or active state', async () => {
  DeliveryService.verifyPayment.mockResolvedValue(true);
  render(<PaymentCallbackPage />);
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/main/delivery/existing-parcel'));
  expect(mockReset).toHaveBeenCalled();
});
test('abandoned payment returns to the existing parcel instead of a new booking form', async () => {
  mockParams.set('status', 'cancelled');
  render(<PaymentCallbackPage />);
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/main/delivery/existing-parcel'));
  expect(DeliveryService.verifyPayment).not.toHaveBeenCalled();
});
