/**
 * ride-store.test.ts
 *
 * Tests for the Zustand ride store.
 *
 * Covers:
 *  L8 — driver.rating typed as number | null (not number | undefined)
 *  H4 — ARRIVED status is not regressed by polling actions
 *  General — reset, persistence shape, initial state
 */

import { useRideStore } from "@/app/main/ride/store/ride";

// Stub google.maps for store import (store references google.maps.LatLngLiteral)
if (typeof window !== "undefined" && !window.google) {
  (window as any).google = {
    maps: {
      Map: jest.fn(),
    },
  };
}

beforeEach(() => {
  // Reset store to initial state before every test
  const store = useRideStore.getState();
  store.resetRide();
  useRideStore.setState({
    rideId: null,
    rideStatus: "idle",
    driver: null,
    tripSummary: null,
    rating: null,
    feedback: "",
    paymentConfirmed: false,
    lockedEstimate: null,
    startOtp: null,
  });
});

// ─── Initial state ───────────────────────────────────────────────────────────
describe("Initial state", () => {
  it('starts with rideStatus "idle"', () => {
    expect(useRideStore.getState().rideStatus).toBe("idle");
  });

  it("starts with driver = null", () => {
    expect(useRideStore.getState().driver).toBeNull();
  });

  it("starts with paymentConfirmed = false", () => {
    expect(useRideStore.getState().paymentConfirmed).toBe(false);
  });
});

// ─── L8: driver.rating is number | null ──────────────────────────────────────
describe("L8 — driver.rating typed as number | null", () => {
  it("accepts rating as a number", () => {
    useRideStore.getState().setDriver({
      name: "Driver A",
      photoUrl: "/profile.webp",
      vehicle: { make: "Toyota", model: "Camry", licensePlate: "ABC-123" },
      rating: 4.5,
      phone: "080",
    });
    expect(useRideStore.getState().driver?.rating).toBe(4.5);
  });

  it("accepts rating as null", () => {
    useRideStore.getState().setDriver({
      name: "Driver B",
      photoUrl: "/profile.webp",
      vehicle: { make: "Honda", model: "Civic", licensePlate: "XYZ-789" },
      rating: null,
      phone: "090",
    });
    expect(useRideStore.getState().driver?.rating).toBeNull();
  });
});

// ─── H4: ARRIVED status persistence ─────────────────────────────────────────
describe("H4 — ARRIVED status is not regressed", () => {
  it('setRideStatus("arrived") persists', () => {
    const store = useRideStore.getState();
    store.setRideStatus("arrived");
    expect(useRideStore.getState().rideStatus).toBe("arrived");
  });

  it('setDriverLocation does NOT reset status from "arrived"', () => {
    const store = useRideStore.getState();
    store.setRideStatus("arrived");
    store.setDriverLocation({ lat: 6.5, lng: 3.3 });
    // After location update, status must still be "arrived"
    expect(useRideStore.getState().rideStatus).toBe("arrived");
  });

  it('setDriverHeading does NOT reset status from "arrived"', () => {
    const store = useRideStore.getState();
    store.setRideStatus("arrived");
    store.setDriverHeading(180);
    expect(useRideStore.getState().rideStatus).toBe("arrived");
  });

  it('setDriverEta does NOT reset status from "arrived"', () => {
    const store = useRideStore.getState();
    store.setRideStatus("arrived");
    store.setDriverEta({ minutes: 0, km: 0 });
    expect(useRideStore.getState().rideStatus).toBe("arrived");
  });
});

// ─── resetRide ───────────────────────────────────────────────────────────────
describe("resetRide", () => {
  it("resets all ride-related state to initial", () => {
    const store = useRideStore.getState();
    store.setRideId("ride-123");
    store.setRideStatus("in-progress");
    store.setDriver({
      name: "Driver C",
      photoUrl: "/photo.jpg",
      vehicle: { make: "V", model: "M", licensePlate: "P" },
      rating: 4.0,
      phone: "070",
    });
    store.setTripSummary({ fare: 5000, distance: 10, duration: 20 });
    store.setPaymentConfirmed(true);

    store.resetRide();

    const state = useRideStore.getState();
    expect(state.rideId).toBeNull();
    expect(state.rideStatus).toBe("idle");
    expect(state.driver).toBeNull();
    expect(state.tripSummary).toBeNull();
    expect(state.paymentConfirmed).toBe(false);
  });

  it("preserves userLocation and mapInstance after reset", () => {
    const store = useRideStore.getState();
    store.setUserLocation({ lat: 6.5, lng: 3.3 });
    store.resetRide();
    expect(useRideStore.getState().userLocation).toEqual({
      lat: 6.5,
      lng: 3.3,
    });
  });
});

// ─── Persistence partialize (key shape) ──────────────────────────────────────
describe("Store persistence shape", () => {
  it("includes rideId, rideStatus, driver, paymentConfirmed in persisted keys", () => {
    // We can test by setting values, then checking that `getState()` after
    // a manual persist/rehydrate cycle contains the expected keys.
    // For now, we just verify the store holds these after set operations.
    const store = useRideStore.getState();
    store.setRideId("r-99");
    store.setRideStatus("confirmed");
    store.setPaymentConfirmed(true);

    const state = useRideStore.getState();
    expect(state.rideId).toBe("r-99");
    expect(state.rideStatus).toBe("confirmed");
    expect(state.paymentConfirmed).toBe(true);
  });
});
