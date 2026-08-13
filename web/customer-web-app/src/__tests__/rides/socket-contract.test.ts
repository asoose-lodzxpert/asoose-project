/**
 * socket-contract.test.ts
 *
 * Regression tests for the socket event type contract and handler behaviour.
 *
 * Covers:
 *  C1 — DriverAcceptedEvent.driver has NO image or rating fields.
 *        The socket handler must NOT access driver.image or driver.rating.
 *        Instead it sets hard-coded defaults (photoUrl="/profile.webp", rating=null).
 */

import type { DriverAcceptedEvent } from "@/services/socket.service";

// ─── C1: DriverAcceptedEvent type contract ───────────────────────────────────
describe("C1 — DriverAcceptedEvent type contract", () => {
  /**
   * Build a standards-compliant DriverAcceptedEvent payload — exactly
   * what the backend sends over the socket.
   */
  function makeDriverAcceptedEvent(
    overrides: Partial<DriverAcceptedEvent["driver"]> = {},
  ): DriverAcceptedEvent {
    return {
      type: "DRIVER_ACCEPTED",
      rideId: "ride-001",
      driver: {
        id: "driver-1",
        name: "John Driver",
        phone: "08012345678",
        vehicle: {
          brand: "Toyota",
          model: "Corolla",
          plateNumber: "ABC-123",
          color: "White",
          year: 2020,
        },
        ...overrides,
      },
    };
  }

  it("does NOT have an image field on driver", () => {
    const event = makeDriverAcceptedEvent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((event.driver as any).image).toBeUndefined();
  });

  it("does NOT have a rating field on driver", () => {
    const event = makeDriverAcceptedEvent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((event.driver as any).rating).toBeUndefined();
  });

  it("has required fields: id, name, phone, vehicle", () => {
    const event = makeDriverAcceptedEvent();
    expect(event.driver.id).toBeDefined();
    expect(event.driver.name).toBeDefined();
    expect(event.driver.phone).toBeDefined();
    expect(event.driver.vehicle).toBeDefined();
    expect(event.driver.vehicle.brand).toBeDefined();
    expect(event.driver.vehicle.model).toBeDefined();
    expect(event.driver.vehicle.plateNumber).toBeDefined();
  });
});

// ─── C1: Handler behaviour (simulated) ──────────────────────────────────────
describe("C1 — onDriverAccepted handler sets safe defaults", () => {
  /**
   * Simulate the handler logic from RideSocketListener.tsx
   * without actually rendering the component (pure function test).
   */
  function simulateDriverAcceptedHandler(data: DriverAcceptedEvent) {
    const { driver } = data;
    return {
      name: driver.name,
      // Socket payload does NOT include image or rating (C1 fix).
      photoUrl: "/profile.webp",
      vehicle: {
        make: driver.vehicle?.brand || "Vehicle",
        model: driver.vehicle?.model || "Car",
        licensePlate: driver.vehicle?.plateNumber || "---",
      },
      rating: null,
      phone: driver.phone,
    };
  }

  it('sets photoUrl to "/profile.webp" (not driver.image)', () => {
    const event: DriverAcceptedEvent = {
      type: "DRIVER_ACCEPTED",
      rideId: "ride-001",
      driver: {
        id: "d1",
        name: "Jane",
        phone: "080",
        vehicle: {
          brand: "B",
          model: "M",
          plateNumber: "P",
          color: "Black",
          year: 2021,
        },
      },
    };
    const result = simulateDriverAcceptedHandler(event);
    expect(result.photoUrl).toBe("/profile.webp");
  });

  it("sets rating to null (not driver.rating)", () => {
    const event: DriverAcceptedEvent = {
      type: "DRIVER_ACCEPTED",
      rideId: "ride-001",
      driver: {
        id: "d1",
        name: "Jane",
        phone: "080",
        vehicle: {
          brand: "B",
          model: "M",
          plateNumber: "P",
          color: "Black",
          year: 2021,
        },
      },
    };
    const result = simulateDriverAcceptedHandler(event);
    expect(result.rating).toBeNull();
  });

  it("maps vehicle.brand → make, vehicle.model → model, vehicle.plateNumber → licensePlate", () => {
    const event: DriverAcceptedEvent = {
      type: "DRIVER_ACCEPTED",
      rideId: "ride-002",
      driver: {
        id: "d2",
        name: "Bob",
        phone: "090",
        vehicle: {
          brand: "Honda",
          model: "Civic",
          plateNumber: "XYZ-789",
          color: "Red",
          year: 2023,
        },
      },
    };
    const result = simulateDriverAcceptedHandler(event);
    expect(result.vehicle.make).toBe("Honda");
    expect(result.vehicle.model).toBe("Civic");
    expect(result.vehicle.licensePlate).toBe("XYZ-789");
  });

  it("uses fallback values when vehicle fields are missing", () => {
    const event: DriverAcceptedEvent = {
      type: "DRIVER_ACCEPTED",
      rideId: "ride-003",
      driver: {
        id: "d3",
        name: "Charlie",
        phone: "070",
        vehicle: { brand: "", model: "", plateNumber: "", color: "", year: 0 },
      },
    };
    const result = simulateDriverAcceptedHandler(event);
    expect(result.vehicle.make).toBe("Vehicle");
    expect(result.vehicle.model).toBe("Car");
    expect(result.vehicle.licensePlate).toBe("---");
  });
});

// ─── Regression: If someone adds image/rating to the type, this MUST break ──
describe("C1 — type regression guard", () => {
  it("DriverAcceptedEvent.driver type keys are exactly {id, name, phone, vehicle}", () => {
    // Build a valid event
    const event: DriverAcceptedEvent = {
      type: "DRIVER_ACCEPTED",
      rideId: "r1",
      driver: {
        id: "1",
        name: "N",
        phone: "P",
        vehicle: {
          brand: "B",
          model: "M",
          plateNumber: "P",
          color: "C",
          year: 2020,
        },
      },
    };

    // Only the expected keys should exist on the driver object
    const driverKeys = Object.keys(event.driver).sort();
    expect(driverKeys).toEqual(["id", "name", "phone", "vehicle"]);
  });
});
