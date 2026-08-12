import { ApiService } from "./api.service";

export interface PropertyRoomType {
  id: string;
  propertyId: string;
  name: string;
  description: string | null;
  pricePerNight: number;
  quantity: number;
  maxGuests: number;
  images: string[];
  image: string | null;
  isActive: boolean;
  availableUnits?: number;
}

export interface Property {
  id: string;
  propertyTypeId: string;
  propertyType: string;
  name: string;
  slug: string;
  description: string | null;
  address: string;
  lat: number | null;
  lng: number | null;
  city: { id: string; name: string; state?: string | null };
  images: string[];
  image: string | null;
  amenities: string[];
  checkInTime: string | null;
  checkOutTime: string | null;
  rating: number;
  totalReviews: number;
  status: string;
  roomTypes: PropertyRoomType[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PropertyFilters {
  page?: number;
  limit?: number;
  cityId: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
}

export interface BookingQuote {
  propertyId: string;
  propertyName: string;
  roomTypeId: string;
  roomTypeName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  unitsBooked: number;
  guests: number;
  availableUnits: number;
  pricePerNight: number;
  subtotal: number;
  serviceFee: number;
  total: number;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  customerId: string;
  propertyId: string;
  propertyName: string;
  propertyImage: string | null;
  roomTypeId: string;
  roomTypeName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  unitsBooked: number;
  guests: number;
  pricePerNight: number;
  subtotal: number;
  serviceFee: number;
  total: number;
  status: string;
  paymentMethod: "WALLET" | "CARD";
  paymentStatus: string;
  specialRequests: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookingPayload {
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  unitsBooked: number;
  specialRequests: string;
  paymentMethod: "WALLET" | "CARD";
  idempotencyKey: string;
}

const query = (values: Record<string, string | number | undefined>) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  return params.toString();
};

export class PropertyService {
  static list(filters: PropertyFilters, token?: string) {
    const qs = query({ page: filters.page ?? 1, limit: filters.limit ?? 20, cityId: filters.cityId, search: filters.search, minPrice: filters.minPrice, maxPrice: filters.maxPrice, checkIn: filters.checkIn, checkOut: filters.checkOut, guests: filters.guests });
    return ApiService.get<{ properties: Property[]; pagination: Pagination }>(`/properties?${qs}`, token);
  }

  static get(id: string, dates?: { checkIn?: string; checkOut?: string }, token?: string) {
    const qs = query({ checkIn: dates?.checkIn, checkOut: dates?.checkOut });
    return ApiService.get<Property>(`/properties/${id}${qs ? `?${qs}` : ""}`, token);
  }

  static quote(payload: Omit<BookingPayload, "specialRequests" | "paymentMethod" | "idempotencyKey">, token?: string) {
    return ApiService.post<BookingQuote>("/bookings/quote", payload, token);
  }

  static create(payload: BookingPayload, token?: string) {
    return ApiService.post<{ booking: Booking; authorizationUrl?: string }>("/bookings", payload, token);
  }

  static bookings(page = 1, limit = 20, token?: string) {
    return ApiService.get<{ bookings: Booking[]; pagination: Pagination }>(`/bookings?page=${page}&limit=${limit}`, token);
  }

  static booking(id: string, token?: string) {
    return ApiService.get<Booking>(`/bookings/${id}`, token);
  }

  static payment(id: string, token?: string) {
    return ApiService.post<{ authorizationUrl: string }>(`/bookings/${id}/payment`, undefined, token);
  }

  static cancel(id: string, reason: string, token?: string) {
    return ApiService.post<Booking>(`/bookings/${id}/cancel`, { reason }, token);
  }
}
