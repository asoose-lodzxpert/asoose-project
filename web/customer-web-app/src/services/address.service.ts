import { ApiService } from "./api.service";

export type AddressLabel = "HOME" | "WORK" | "OTHER";

export interface SavedAddress {
  id: string;
  userId: string;
  label: AddressLabel | string;
  street: string | null;
  apartment: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  instructions: string | null;
  isDefault: boolean;
  placeId: string | null;
  cityId: string | null;
  serviceAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressInput {
  label: AddressLabel;
  latitude: number;
  longitude: number;
  street?: string;
  apartment?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  instructions?: string;
  isDefault?: boolean;
  placeId?: string;
}

export class AddressService {
  static list(token?: string) {
    return ApiService.get<SavedAddress[]>("/addresses", token);
  }

  static create(payload: CreateAddressInput, token?: string) {
    return ApiService.post<SavedAddress>("/addresses", payload, token);
  }

  static delete(id: string, token?: string) {
    return ApiService.delete<null>(`/addresses/${id}`, token);
  }

  static setDefault(id: string, token?: string) {
    return ApiService.patch<SavedAddress>(`/addresses/${id}/default`, undefined, token);
  }
}
