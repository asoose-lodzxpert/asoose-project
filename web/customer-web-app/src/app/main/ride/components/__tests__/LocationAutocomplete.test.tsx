import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import LocationAutocomplete from "../LocationAutocomplete";
// We don't strictly need the provider here if we are mocking window.google directly, 
// but it's good practice if your component relies on the context for loading states.

// 1. Setup Global Mocks
const mockGetDetails = jest.fn();
const mockGeocode = jest.fn();
const mockGetPlacePredictions = jest.fn();

beforeAll(() => {
  // Mock the Google Maps Global Object
  global.window.google = {
    maps: {
      places: {
        AutocompleteService: class {
          getPlacePredictions = mockGetPlacePredictions;
        },
        PlacesService: class {
          getDetails = mockGetDetails;
        },
        AutocompleteSessionToken: class {},
        PlacesServiceStatus: { OK: "OK" },
      },
      Geocoder: class {
        geocode = mockGeocode;
      },
    },
  } as any;
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("LocationAutocomplete Remediation", () => {
  const mockSelect = jest.fn();

  it("should block selection if getDetails fails (Critical Fix 1)", async () => {
    // SETUP: Mock Autocomplete to return valid suggestions
    mockGetPlacePredictions.mockResolvedValue({
      predictions: [
        {
          description: "Lagos, Nigeria",
          place_id: "123",
          structured_formatting: {
            main_text: "Lagos",
            secondary_text: "Nigeria",
          },
        },
      ],
    });

    // SETUP: Mock getDetails to FAIL
    mockGetDetails.mockImplementation((req, cb) => cb(null, "ZERO_RESULTS"));

    render(<LocationAutocomplete onSelect={mockSelect} isLoaded={true} />);

    const input = screen.getByRole("textbox");

    // ACT: Type into input
    fireEvent.change(input, { target: { value: "Lagos" } });

    // WAIT: For debounce and API call. 
    // We wait for the text "Lagos" to appear in the DROPDOWN (not just input value)
    // The component renders 'main_text' which is "Lagos"
    await waitFor(() => {
      // We use getByText with a selector or strict match to ensure we aren't just finding the input value
      // The dropdown items are usually in <p> or <li> tags
      expect(screen.getByText("Nigeria")).toBeInTheDocument(); 
    });

    // ACT: Click the suggestion
    fireEvent.mouseDown(screen.getByText("Nigeria"));

    // ASSERT: Ensure onSelect was NOT called with invalid data
    expect(mockSelect).not.toHaveBeenCalled();
    
    // ASSERT: Ensure error message is shown
    // Note: The error message might need to match exactly what is in your component
    await waitFor(() => {
        expect(screen.getByText(/Could not fetch coordinates/i)).toBeInTheDocument();
    });
  });

  it("should use coordinates fallback if reverse geocoding fails (Critical Fix 2)", async () => {
    // SETUP: Mock Navigator Geolocation
    const mockGeolocation = {
      getCurrentPosition: jest.fn().mockImplementation((success) =>
        success({ coords: { latitude: 6.5, longitude: 3.3 } })
      ),
    };
    (global.navigator as any).geolocation = mockGeolocation;

    // SETUP: Mock Geocoder to FAIL (simulate billing/network issue)
    mockGeocode.mockImplementation((req, cb) => cb(null, "REQUEST_DENIED"));

    render(<LocationAutocomplete onSelect={mockSelect} isLoaded={true} />);

    const input = screen.getByRole("textbox");
    
    // ACT: Focus to see the "Use current location" button
    fireEvent.focus(input);
    const locationBtn = screen.getByText("Use current location");
    
    // ACT: Click "Use Current Location"
    fireEvent.mouseDown(locationBtn);

    // ASSERT: Check Final State
    await waitFor(() => {
      // 1. Callback MUST be called with coordinates but generic address
      expect(mockSelect).toHaveBeenCalledWith(expect.objectContaining({
        lat: 6.5,
        lng: 3.3,
        placeId: undefined, // Explicitly undefined
      }));
      
      // 2. Input value MUST show the fallback text
      // We look for the exact string format defined in your component
      expect(input).toHaveValue("Pinned Location (6.50000, 3.30000)");
    });
  });
});