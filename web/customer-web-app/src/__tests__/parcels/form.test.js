import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import DeliveryPage from "@/app/main/delivery/page";
import DeliveryProgressUI from "@/app/main/delivery/components/DeliveryProgressUi";
import { useDeliveryStore } from "@/store/useDeliveryStore";
import { DeliveryService } from "@/services/delivery.service";
import { WalletService } from "@/services/wallet.service";
import { redirectToParcelPayment } from "@/lib/parcel-booking";

const mockPush = jest.fn();
const mockAddressList = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockPush }),
}));
jest.mock("next-auth/react", () => ({
  useSession: () => ({
    status: "authenticated",
    data: { accessToken: "token" },
  }),
}));
jest.mock("@/services/delivery.service", () => ({
  DeliveryService: { estimateParcel: jest.fn(), createDelivery: jest.fn() },
}));
jest.mock("@/services/address.service", () => ({
  AddressService: { list: (...args) => mockAddressList(...args) },
}));
jest.mock("@/services/api.service", () => ({
  ApiService: {
    get: () =>
      Promise.resolve({
        firstName: "Chidi",
        lastName: "Okafor",
        phone: "+2348098765432",
      }),
  },
}));
jest.mock("@/services/wallet.service", () => ({
  WalletService: { getMyWallet: jest.fn(), initializeTopup: jest.fn() },
}));
jest.mock("@/components/shared/LocationInput", () => ({
  LocationInput: ({ value, onValueChange, placeholder }) => (
    <input
      aria-label={placeholder}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    />
  ),
}));
jest.mock("@/app/main/delivery/components/DeliveryMapPicker", () => ({
  DeliveryMapPicker: () => null,
}));
jest.mock("@/lib/parcel-booking", () => ({
  ...jest.requireActual("@/lib/parcel-booking"),
  redirectToParcelPayment: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockAddressList.mockResolvedValue([]);
  useDeliveryStore.getState().resetDelivery();
  useDeliveryStore.setState({
    pickupPos: { lat: 6, lng: 3 },
    dropoffPos: { lat: 7, lng: 3 },
  });
  useDeliveryStore
    .getState()
    .setPackageInfo({
      pickupAddress: "Marina Road",
      destinationAddress: "Ikeja Road",
      recipientName: "Ada Okafor",
      recipientPhone: "+2348012345678",
    });
  DeliveryService.estimateParcel.mockResolvedValue({
    fare: 1500,
    distanceKm: 5,
    estimatedDurationMinutes: 15,
  });
  WalletService.getMyWallet.mockResolvedValue({ balance: 5000 });
  DeliveryService.createDelivery.mockResolvedValue({
    delivery: { id: "parcel-id", status: "SEARCHING_RIDER" },
  });
});
async function review() {
  render(<DeliveryPage />);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByRole("heading", { name: "Review and book your parcel" });
}
test("three steps preserve contacts across Back and focus the first invalid field", async () => {
  useDeliveryStore
    .getState()
    .setPackageInfo({ recipientName: "", recipientPhone: "" });
  render(<DeliveryPage />);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(
    await screen.findByText("Enter a name between 2 and 100 characters."),
  ).toBeInTheDocument();
  await waitFor(() =>
    expect(screen.getByLabelText("recipient name")).toHaveFocus(),
  );
  fireEvent.change(screen.getByLabelText("recipient name"), {
    target: { value: "Ada Okafor" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(screen.getByLabelText("recipient name")).toHaveValue("Ada Okafor");
});
test("editing address text immediately blocks Continue until coordinates and quote are valid", async () => {
  render(<DeliveryPage />);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled(),
  );
  fireEvent.change(screen.getByLabelText("Search pickup address"), {
    target: { value: "A different road" },
  });
  expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  expect(useDeliveryStore.getState().pickupPos).toBeNull();
});
test("saved addresses have readable labels and populate the selected location", async () => {
  mockAddressList.mockResolvedValue([
    {
      id: "home-address",
      label: "HOME",
      apartment: "Flat 4",
      street: "12 Marina Road",
      city: "Lagos",
      state: "Lagos",
      latitude: 6.45,
      longitude: 3.39,
      isDefault: true,
    },
  ]);
  render(<DeliveryPage />);
  const savedPickup = await screen.findByLabelText("Saved pickup address");
  expect(
    screen.getAllByRole("option", {
      name: "Home (Default) — Flat 4, 12 Marina Road, Lagos, Lagos",
    }),
  ).toHaveLength(2);
  fireEvent.change(savedPickup, { target: { value: "home-address" } });
  expect(useDeliveryStore.getState().pickupPos).toEqual({
    lat: 6.45,
    lng: 3.39,
  });
  expect(useDeliveryStore.getState().packageInfo.pickupAddress).toBe(
    "Flat 4, 12 Marina Road, Lagos, Lagos",
  );
});
test("immediate web payment omits scheduling and prevents double submission", async () => {
  let resolve;
  DeliveryService.createDelivery.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  await review();
  expect(screen.queryByRole("button", { name: "Cash" })).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Pay on web" }),
  ).toHaveAttribute("aria-pressed", "true");
  const button = screen.getByRole("button", { name: /Continue to payment/ });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(DeliveryService.createDelivery).toHaveBeenCalledTimes(1);
  const payload = DeliveryService.createDelivery.mock.calls[0][0];
  expect(payload.paymentMethod).toBe("CARD");
  expect(payload).not.toHaveProperty("scheduledAt");
  expect(payload).not.toHaveProperty("senderName");
  expect(payload.idempotencyKey).toMatch(/^parcel-/);
  await act(async () => resolve({ delivery: { id: "parcel-id" } }));
  expect(mockPush).toHaveBeenCalledWith("/main/delivery/parcel-id");
  expect(useDeliveryStore.getState().submission).toBeNull();
});
test("failed submissions retain a stable idempotency key and entered values", async () => {
  DeliveryService.createDelivery.mockRejectedValueOnce(
    new Error("Network unavailable"),
  );
  await review();
  fireEvent.click(screen.getByRole("button", { name: /Continue to payment/ }));
  await screen.findByText("Network unavailable");
  expect(useDeliveryStore.getState().packageInfo.recipientName).toBe(
    "Ada Okafor",
  );
  const first = DeliveryService.createDelivery.mock.calls[0][0];
  fireEvent.click(screen.getByRole("button", { name: /Retry booking/ }));
  await waitFor(() =>
    expect(DeliveryService.createDelivery).toHaveBeenCalledTimes(2),
  );
  expect(DeliveryService.createDelivery.mock.calls[1][0]).toEqual(first);
});
test("wallet insufficient balance blocks booking and offers top-up", async () => {
  WalletService.getMyWallet.mockResolvedValue({ balance: 100 });
  await review();
  fireEvent.click(screen.getByRole("button", { name: "Wallet" }));
  await screen.findByText(/Insufficient balance/);
  expect(screen.getByRole("button", { name: /Book parcel/ })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Top up wallet" })).toBeEnabled();
  expect(DeliveryService.createDelivery).not.toHaveBeenCalled();
});
test("scheduled wallet booking sends local time as ISO and charges via creation", async () => {
  await review();
  fireEvent.click(screen.getByRole("button", { name: "Wallet" }));
  fireEvent.click(screen.getByRole("button", { name: "Schedule for later" }));
  fireEvent.change(screen.getByLabelText("Pickup date and time"), {
    target: { value: "2030-12-01T09:00" },
  });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: /Schedule parcel/ })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: /Schedule parcel/ }));
  await waitFor(() =>
    expect(DeliveryService.createDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentMethod: "WALLET",
        scheduledAt: new Date("2030-12-01T09:00").toISOString(),
      }),
      "token",
    ),
  );
});
test("past date blocks booking with a focused field error", async () => {
  await review();
  fireEvent.click(screen.getByRole("button", { name: "Schedule for later" }));
  fireEvent.change(screen.getByLabelText("Pickup date and time"), {
    target: { value: "2020-12-01T09:00" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Continue to payment/ }));
  expect(
    await screen.findByText("Choose a future pickup date and time."),
  ).toBeInTheDocument();
  expect(DeliveryService.createDelivery).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Pickup date and time")).toHaveFocus();
});
test("pay on web redirects using the returned authorization URL", async () => {
  DeliveryService.createDelivery.mockResolvedValue({
    delivery: { id: "card-parcel", status: "PENDING" },
    authorizationUrl: "https://checkout.paystack.com/test",
  });
  await review();
  fireEvent.click(screen.getByRole("button", { name: "Pay on web" }));
  fireEvent.click(screen.getByRole("button", { name: /Continue to payment/ }));
  await waitFor(() =>
    expect(redirectToParcelPayment).toHaveBeenCalledWith(
      "card-parcel",
      "https://checkout.paystack.com/test",
      undefined,
    ),
  );
  expect(mockPush).not.toHaveBeenCalled();
});
test("scheduled tracking renders schedule without claiming to search for a rider", () => {
  render(
    <DeliveryProgressUI
      delivery={{
        id: "scheduled",
        status: "SCHEDULED",
        scheduledAt: "2030-12-01T09:00:00Z",
        deliveryFee: 1500,
        paymentMethod: "CASH",
      }}
    />,
  );
  expect(screen.getByText("Scheduled")).toBeInTheDocument();
  expect(screen.getByText(/Scheduled pickup ·/)).toBeInTheDocument();
  expect(screen.queryByText("Looking for a courier")).not.toBeInTheDocument();
});
