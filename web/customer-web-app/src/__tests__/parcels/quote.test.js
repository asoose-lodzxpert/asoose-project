import { act, renderHook, waitFor } from "@testing-library/react";
import { useParcelQuote } from "@/hooks/useParcelQuote";
import { DeliveryService } from "@/services/delivery.service";
jest.mock("@/services/delivery.service", () => ({
  DeliveryService: { estimateParcel: jest.fn() },
}));
const pickup = { latitude: 6, longitude: 3, address: "Pickup" };
const dropoff = { latitude: 7, longitude: 3, address: "Dropoff" };
const quote = { fare: 1000, distanceKm: 3, estimatedDurationMinutes: 10 };
beforeEach(() => jest.clearAllMocks());
test("invalidates instantly on size and location changes and ignores an older response", async () => {
  let oldResolve;
  DeliveryService.estimateParcel
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          oldResolve = resolve;
        }),
    )
    .mockResolvedValue(quote);
  const { result, rerender } = renderHook(
    ({ size, point }) => useParcelQuote(pickup, point, size, "token"),
    { initialProps: { size: "SMALL", point: dropoff } },
  );
  await waitFor(() => expect(oldResolve).toBeDefined());
  rerender({ size: "LARGE", point: dropoff });
  expect(result.current.quote).toBeUndefined();
  await waitFor(() => expect(result.current.quote).toEqual(quote));
  await act(async () => oldResolve({ ...quote, fare: 999 }));
  expect(result.current.quote.fare).toBe(1000);
  rerender({ size: "LARGE", point: { ...dropoff, latitude: 8 } });
  expect(result.current.quote).toBeUndefined();
  await waitFor(() => expect(result.current.quote).toEqual(quote));
  rerender({ size: "LARGE", point: null });
  expect(result.current.quote).toBeUndefined();
});
test("shows API failures inline and can retry", async () => {
  DeliveryService.estimateParcel
    .mockRejectedValueOnce(new Error("Outside coverage"))
    .mockResolvedValue(quote);
  const { result } = renderHook(() =>
    useParcelQuote(pickup, dropoff, "SMALL", "token"),
  );
  await waitFor(() => expect(result.current.error).toBe("Outside coverage"));
  act(() => result.current.retry());
  expect(result.current.quote).toBeUndefined();
  await waitFor(() => expect(result.current.quote).toEqual(quote));
});
