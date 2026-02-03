import { RidersService } from '../riders.service';

// Mock Prisma
const mockPrisma = {
  delivery: { findMany: jest.fn() },
  rider: { findUnique: jest.fn() }
};

describe('Monetary Precision', () => {
  let service: RidersService;

  beforeEach(() => {
    service = new RidersService(mockPrisma as any, {} as any);
  });

  it('should handle floating point arithmetic safely', async () => {
    // 1. Setup: Create deliveries with amounts that cause float artifacts
    // 0.1 + 0.2 in JS = 0.30000000000000004
    mockPrisma.delivery.findMany.mockResolvedValue([
      { deliveryFee: 0.1, createdAt: new Date(), deliveredAt: new Date() },
      { deliveryFee: 0.2, createdAt: new Date(), deliveredAt: new Date() },
    ]);
    mockPrisma.rider.findUnique.mockResolvedValue({ rating: 5 });

    // 2. Execute
    const earnings = await service.getEarnings('rider-1', 'today');

    // 3. Assert
    // The service logic: total = deliveryFees + bonuses (5%) + serviceFees (-15%)
    // fee = 0.3
    // bonus = 0.015
    // serviceFee = -0.045
    // total = 0.27
    
    const total = earnings.total;
    
    // Check for artifacts like 0.27000000000000003
    const decimalPlaces = total.toString().split('.')[1]?.length || 0;
    
    if (decimalPlaces > 2) {
      throw new Error(`PRECISION FAILURE: Earnings calculated as ${total}. Gateways reject >2 decimal places.`);
    }
    
    expect(total).toBeCloseTo(0.27, 2);
  });
});