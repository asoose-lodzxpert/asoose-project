import {
  parcelContactsPayload,
  scheduledTimestamp,
  validateParcelContacts,
  parcelStatusLabel,
} from "@/lib/parcel-booking";
import { DeliveryService, mapParcelStatus } from "@/services/delivery.service";
import { ApiService } from "@/services/api.service";
jest.mock("@/services/api.service", () => ({
  ApiService: { post: jest.fn(), get: jest.fn() },
}));
const fields = {
  senderName: "Chidi Okafor",
  senderPhone: "+2348098765432",
  recipientName: "Ada Okafor",
  recipientPhone: "+2348012345678",
  instructions: "Collect from reception",
};
const pickup = { latitude: 6.4541, longitude: 3.3947, address: "Marina Road" };
const dropoff = { latitude: 6.6018, longitude: 3.3515, address: "Ikeja Road" };
beforeEach(() => jest.clearAllMocks());
test.each(["SENDER", "RECIPIENT", "THIRD_PARTY"])(
  "%s sends only the required contacts",
  (party) => {
    const payload = parcelContactsPayload(party, fields);
    expect(payload.party).toBe(party);
    expect(Boolean(payload.senderName)).toBe(party !== "SENDER");
    expect(Boolean(payload.recipientName)).toBe(party !== "RECIPIENT");
    expect(validateParcelContacts(party, fields)).toEqual({});
    const missing = {
      ...fields,
      senderName: "",
      senderPhone: "",
      recipientName: "",
      recipientPhone: "",
    };
    const errors = validateParcelContacts(party, missing);
    expect(Boolean(errors.senderName)).toBe(party !== "SENDER");
    expect(Boolean(errors.recipientName)).toBe(party !== "RECIPIENT");
    expect(Boolean(errors.senderPhone)).toBe(party !== "SENDER");
    expect(Boolean(errors.recipientPhone)).toBe(party !== "RECIPIENT");
  },
);
test("validates description and contact boundaries", () => {
  expect(
    validateParcelContacts("SENDER", {
      ...fields,
      instructions: "ab",
      recipientName: "A",
      recipientPhone: "letters",
    }),
  ).toEqual(
    expect.objectContaining({
      instructions: expect.any(String),
      recipientName: expect.any(String),
      recipientPhone: expect.any(String),
    }),
  );
  expect(
    validateParcelContacts("SENDER", { ...fields, instructions: "" }),
  ).toEqual({});
  expect(
    validateParcelContacts("THIRD_PARTY", {
      ...fields,
      senderName: "a".repeat(101),
      senderPhone: "1".repeat(21),
      instructions: "a".repeat(501),
    }),
  ).toHaveProperty("senderPhone");
});
test("immediate scheduling is omitted, future dates use ISO, and past/invalid dates fail", () => {
  expect(scheduledTimestamp(false, "invalid")).toBeUndefined();
  expect(scheduledTimestamp(true, "2030-12-01T09:00")).toBe(
    new Date("2030-12-01T09:00").toISOString(),
  );
  expect(() => scheduledTimestamp(true, "2020-01-01T09:00")).toThrow("future");
  expect(() => scheduledTimestamp(true, "")).toThrow("future");
});
test("estimate uses the authenticated parcel endpoint and unwraps its result", async () => {
  const quote = {
    fare: 1500,
    distanceKm: 5,
    estimatedDurationMinutes: 20,
    sizeMultiplier: 1,
  };
  ApiService.post.mockResolvedValue(quote);
  expect(
    await DeliveryService.estimateParcel(pickup, dropoff, "SMALL", "token"),
  ).toEqual(quote);
  expect(ApiService.post).toHaveBeenCalledWith(
    "/parcels/estimate",
    { pickup, dropoff, size: "SMALL" },
    "token",
  );
});
test.each(["CASH", "WALLET", "CARD"])(
  "%s creation preserves party, schedule, payment and idempotency",
  async (paymentMethod) => {
    const input = {
      pickup,
      dropoff,
      size: "SMALL",
      ...parcelContactsPayload("THIRD_PARTY", fields),
      scheduledAt: "2030-12-01T09:00:00.000Z",
      paymentMethod,
      idempotencyKey: "parcel-stable-key",
    };
    const status = paymentMethod === "CARD" ? "PENDING" : "SCHEDULED";
    ApiService.post.mockResolvedValue({
      parcel: {
        id: "parcel-id",
        status,
        scheduledAt: input.scheduledAt,
        fare: 1500,
        paymentMethod,
        paymentStatus: paymentMethod === "WALLET" ? "COMPLETED" : "PENDING",
      },
      authorizationUrl:
        paymentMethod === "CARD"
          ? "https://checkout.paystack.com/test"
          : undefined,
    });
    const result = await DeliveryService.createDelivery(input, "token");
    expect(ApiService.post).toHaveBeenCalledWith("/parcels", input, "token", {
      timeoutMs: 30000,
    });
    expect(result.delivery.status).toBe(status);
    expect(result.delivery.scheduledAt).toBe(input.scheduledAt);
    expect(Boolean(result.authorizationUrl)).toBe(paymentMethod === "CARD");
  },
);
test("payment retry uses the existing parcel, and scheduled statuses are never pending", async () => {
  ApiService.post.mockResolvedValue({
    authorizationUrl: "https://checkout.paystack.com/retry",
  });
  await DeliveryService.retryPayment("parcel-id", "token");
  expect(ApiService.post).toHaveBeenCalledWith(
    "/parcels/parcel-id/retry-payment",
    undefined,
    "token",
  );
  expect(mapParcelStatus("SCHEDULED")).toBe("SCHEDULED");
  expect(mapParcelStatus("SEARCHING_RIDER")).toBe("SEARCHING_RIDER");
  expect(parcelStatusLabel("PENDING", "CARD", "PENDING")).toBe(
    "Payment pending",
  );
});
