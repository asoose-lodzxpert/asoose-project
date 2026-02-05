import { Test, TestingModule } from '@nestjs/testing';
import { GeoService } from './geo.service';

describe('GeoService', () => {
  let service: GeoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeoService],
    }).compile();

    service = module.get<GeoService>(GeoService);
  });

  describe('latLngToHex', () => {
    it('should convert Lagos coordinates to H3 hex', () => {
      const lat = 6.5244;
      const lng = 3.3792;
      const hex = service.latLngToHex(lat, lng);

      expect(hex).toBeDefined();
      expect(typeof hex).toBe('string');
      expect(hex.length).toBeGreaterThan(0);
    });

    it('should return same hex for nearby coordinates', () => {
      const hex1 = service.latLngToHex(6.5244, 3.3792);
      const hex2 = service.latLngToHex(6.5245, 3.3793);

      // Very close coordinates should map to same hex at resolution 8
      expect(hex1).toBe(hex2);
    });

    it('should return different hex for far coordinates', () => {
      const hex1 = service.latLngToHex(6.5244, 3.3792); // Lagos Island
      const hex2 = service.latLngToHex(6.4281, 3.4219); // Surulere

      expect(hex1).not.toBe(hex2);
    });
  });

  describe('getHexRings', () => {
    it('should return correct number of rings', () => {
      const centerHex = service.latLngToHex(6.5244, 3.3792);
      const rings = service.getHexRings(centerHex, 3);

      expect(rings).toHaveLength(4); // 0, 1, 2, 3
    });

    it('should have 1 hex in ring 0 (center)', () => {
      const centerHex = service.latLngToHex(6.5244, 3.3792);
      const rings = service.getHexRings(centerHex, 1);

      expect(rings[0]).toHaveLength(1);
      expect(rings[0][0]).toBe(centerHex);
    });

    it('should have 6 hexes in ring 1', () => {
      const centerHex = service.latLngToHex(6.5244, 3.3792);
      const rings = service.getHexRings(centerHex, 1);

      expect(rings[1]).toHaveLength(6);
    });

    it('should not duplicate hexes across rings', () => {
      const centerHex = service.latLngToHex(6.5244, 3.3792);
      const rings = service.getHexRings(centerHex, 2);

      const allHexes = rings.flat();
      const uniqueHexes = new Set(allHexes);

      expect(allHexes.length).toBe(uniqueHexes.size);
    });

    it('should respect max rings limit', () => {
      const centerHex = service.latLngToHex(6.5244, 3.3792);
      const rings = service.getHexRings(centerHex, 10); // Request more than MAX_RINGS

      expect(rings.length).toBeLessThanOrEqual(6); // Should cap at MAX_RINGS + 1
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two Lagos locations', () => {
      const lagosIsland = { lat: 6.5244, lng: 3.3792 };
      const surulere = { lat: 6.4281, lng: 3.4219 };

      const distance = service.calculateDistance(
        lagosIsland.lat,
        lagosIsland.lng,
        surulere.lat,
        surulere.lng,
      );

      // Distance should be approximately 12-13 km
      expect(distance).toBeGreaterThan(10);
      expect(distance).toBeLessThan(15);
    });

    it('should return 0 for same coordinates', () => {
      const distance = service.calculateDistance(
        6.5244,
        3.3792,
        6.5244,
        3.3792,
      );

      expect(distance).toBe(0);
    });

    it('should return small distance for nearby coordinates', () => {
      const distance = service.calculateDistance(
        6.5244,
        3.3792,
        6.5254,
        3.3802,
      );

      // Should be less than 2 km
      expect(distance).toBeLessThan(2);
    });
  });

  describe('sortByDistance', () => {
    it('should sort drivers by distance from pickup', () => {
      const pickupLat = 6.5244;
      const pickupLng = 3.3792;

      const drivers = [
        { id: 'driver-1', lat: 6.53, lng: 3.39 }, // Far
        { id: 'driver-2', lat: 6.5245, lng: 3.3793 }, // Close
        { id: 'driver-3', lat: 6.54, lng: 3.4 }, // Farther
        { id: 'driver-4', lat: 6.5246, lng: 3.3794 }, // Close
      ];

      const sorted = service.sortByDistance(pickupLat, pickupLng, drivers);

      // Closest drivers should be first
      expect(sorted[0].id).toBe('driver-2');
      expect(sorted[1].id).toBe('driver-4');
    });

    it('should handle empty drivers array', () => {
      const sorted = service.sortByDistance(6.5244, 3.3792, []);
      expect(sorted).toEqual([]);
    });

    it('should handle single driver', () => {
      const drivers = [{ id: 'driver-1', lat: 6.5245, lng: 3.3793 }];
      const sorted = service.sortByDistance(6.5244, 3.3792, drivers);

      expect(sorted).toHaveLength(1);
      expect(sorted[0].id).toBe('driver-1');
    });
  });

  describe('validateCoordinates', () => {
    it('should validate correct Lagos coordinates', () => {
      const isValid = service.validateCoordinates(6.5244, 3.3792);
      expect(isValid).toBe(true);
    });

    it('should reject invalid latitude', () => {
      const isValid = service.validateCoordinates(91, 3.3792);
      expect(isValid).toBe(false);
    });

    it('should reject invalid longitude', () => {
      const isValid = service.validateCoordinates(6.5244, 181);
      expect(isValid).toBe(false);
    });

    it('should reject negative out-of-bounds coordinates', () => {
      const isValid = service.validateCoordinates(-91, -181);
      expect(isValid).toBe(false);
    });

    it('should accept valid boundary coordinates', () => {
      expect(service.validateCoordinates(90, 180)).toBe(true);
      expect(service.validateCoordinates(-90, -180)).toBe(true);
    });
  });

  describe('calculateFare', () => {
    it('should calculate fare for standard ride', () => {
      const distanceKm = 10;
      const durationMin = 20;

      const fareBreakdown = service.calculateFare(distanceKm, durationMin);

      expect(fareBreakdown.totalFare).toBeGreaterThan(0);
      expect(fareBreakdown.baseFare).toBe(500);
      expect(fareBreakdown.distanceFare).toBeGreaterThan(0);
      expect(fareBreakdown.timeFare).toBeGreaterThan(0);
      expect(fareBreakdown.platformFee).toBeGreaterThan(0);
      expect(fareBreakdown.driverFee).toBeGreaterThan(0);
    });

    it('should calculate higher fare for longer distance', () => {
      const fare1 = service.calculateFare(5, 15);
      const fare2 = service.calculateFare(15, 25);

      expect(fare2.totalFare).toBeGreaterThan(fare1.totalFare);
      expect(fare2.distanceFare).toBeGreaterThan(fare1.distanceFare);
    });

    it('should include platform fee in total fare', () => {
      const fareBreakdown = service.calculateFare(10, 20);

      // Platform fee should be 15% of subtotal
      const subtotal =
        fareBreakdown.baseFare +
        fareBreakdown.distanceFare +
        fareBreakdown.timeFare;
      const expectedPlatformFee = Math.round(subtotal * 0.15);

      expect(fareBreakdown.platformFee).toBe(expectedPlatformFee);
      expect(fareBreakdown.totalFare).toBe(
        subtotal + fareBreakdown.platformFee,
      );
    });
  });

  describe('calculateDeliveryFee', () => {
    it('should calculate fee for standard delivery', () => {
      const distanceKm = 5;
      const weightKg = 2;

      const fee = service.calculateDeliveryFee(distanceKm, weightKg);

      expect(fee).toBeGreaterThan(0);
      expect(typeof fee).toBe('number');
    });

    it('should calculate higher fee for longer distance', () => {
      const fee1 = service.calculateDeliveryFee(5, 2);
      const fee2 = service.calculateDeliveryFee(15, 2);

      expect(fee2).toBeGreaterThan(fee1);
    });

    it('should calculate higher fee for heavier packages', () => {
      const fee1 = service.calculateDeliveryFee(5, 2);
      const fee2 = service.calculateDeliveryFee(5, 10);

      expect(fee2).toBeGreaterThan(fee1);
    });

    it('should have minimum delivery fee', () => {
      const fee = service.calculateDeliveryFee(0.1, 0.1);

      // Should have a reasonable minimum fee
      expect(fee).toBeGreaterThan(0);
    });
  });

  describe('isWithinServiceArea', () => {
    it('should accept coordinates within Lagos', () => {
      const isWithin = service.isWithinServiceArea(6.5244, 3.3792);
      expect(isWithin).toBe(true);
    });

    it('should accept coordinates in Ikeja', () => {
      const isWithin = service.isWithinServiceArea(6.6018, 3.3515);
      expect(isWithin).toBe(true);
    });

    it('should accept all valid coordinates (MVP behavior)', () => {
      // In MVP, service area check accepts all valid coordinates
      // Coordinates in Abuja (far from Lagos)
      const isWithin = service.isWithinServiceArea(9.0765, 7.3986);
      expect(isWithin).toBe(true);
    });

    it('should reject invalid coordinates', () => {
      expect(service.isWithinServiceArea(91, 3.3792)).toBe(false);
      expect(service.isWithinServiceArea(6.5244, 181)).toBe(false);
      expect(service.isWithinServiceArea(-91, -181)).toBe(false);
    });
  });

  describe('generateOTP', () => {
    it('should generate OTP of specified length', () => {
      const otp = service.generateOTP(4);
      expect(otp).toHaveLength(4);
    });

    it('should generate numeric OTP', () => {
      const otp = service.generateOTP(6);
      expect(/^\d+$/.test(otp)).toBe(true);
    });

    it('should generate different OTPs', () => {
      const otp1 = service.generateOTP(6);
      const otp2 = service.generateOTP(6);

      // Very unlikely to be the same
      expect(otp1).not.toBe(otp2);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete matching workflow', () => {
      // Pickup location (Lagos Island)
      const pickupLat = 6.5244;
      const pickupLng = 3.3792;

      // Get pickup hex
      const pickupHex = service.latLngToHex(pickupLat, pickupLng);
      expect(pickupHex).toBeDefined();

      // Get expanding rings
      const rings = service.getHexRings(pickupHex, 3);
      expect(rings.length).toBe(4);

      // Simulate drivers in various hexes
      const drivers = [
        { id: 'd1', lat: 6.5245, lng: 3.3793 }, // Ring 0
        { id: 'd2', lat: 6.53, lng: 3.385 }, // Ring 1
        { id: 'd3', lat: 6.54, lng: 3.4 }, // Ring 2
      ];

      // Sort by distance
      const sorted = service.sortByDistance(pickupLat, pickupLng, drivers);
      expect(sorted[0].id).toBe('d1'); // Closest

      // Calculate fare for the match
      const distance = service.calculateDistance(
        pickupLat,
        pickupLng,
        6.4281,
        3.4219,
      );
      const duration = service.estimateDuration(distance);
      const fareBreakdown = service.calculateFare(distance, duration);
      expect(fareBreakdown.totalFare).toBeGreaterThan(0);
    });

    it('should handle delivery matching workflow', () => {
      // Restaurant location
      const pickupLat = 6.5244;
      const pickupLng = 3.3792;

      // Customer location
      const dropoffLat = 6.4281;
      const dropoffLng = 3.4219;

      // Calculate distance
      const distance = service.calculateDistance(
        pickupLat,
        pickupLng,
        dropoffLat,
        dropoffLng,
      );

      // Calculate delivery fee
      const fee = service.calculateDeliveryFee(distance, 3);
      expect(fee).toBeGreaterThan(0);

      // Get pickup hex and rings
      const pickupHex = service.latLngToHex(pickupLat, pickupLng);
      const rings = service.getHexRings(pickupHex, 2);

      // Verify rings structure
      expect(rings[0]).toHaveLength(1); // Center
      expect(rings[1]).toHaveLength(6); // First ring
    });
  });
});
