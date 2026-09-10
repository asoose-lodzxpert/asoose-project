import { it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, cleanup } from '@testing-library/react';
import { OrderSummary } from '@/app/main/components/checkout/ordersummary';
import { useCartStore } from '@/store/useCartStore';

const props = {
  cartTotal: 2500, deliveryFee: 400, serviceFee: 50, vatAmount: 100,
  quoteGrandTotal: 3050, isProcessing: false, isDisabled: false,
  onPlaceOrder: jest.fn(), retryCount: 0, paymentMethod: 'CARD' as const,
};
beforeEach(() => { cleanup(); useCartStore.getState().clearCart(); });
it('displays confirmed subtotal and total', () => {
  render(<OrderSummary {...props} />);
  expect(screen.getByText('₦2,500')).toBeTruthy();
  expect(screen.getByText('₦3,050')).toBeTruthy();
  expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(false);
});
it('prevents payment when subtotal has not been confirmed', () => {
  render(<OrderSummary {...props} cartTotal={null} quoteGrandTotal={null} />);
  expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  expect(screen.queryByText('₦3,050')).toBeNull();
});
it('does not invent missing fees or allow payment with incomplete pricing', () => {
  render(<OrderSummary {...props} serviceFee={null} vatAmount={null} quoteGrandTotal={null} />);
  expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getAllByText('—').length).toBe(3);
});
it('refreshes saved unit price when adding the same item again', () => {
  const item = { id: 'p1', name: 'Rice', price: 1000, quantity: 1, restaurantId: 's1' };
  useCartStore.getState().addItem(item);
  useCartStore.getState().addItem({ ...item, price: 1500 });
  expect(useCartStore.getState().getTotalPrice()).toBe(3000);
  expect(useCartStore.getState().getTotalItems()).toBe(2);
});
