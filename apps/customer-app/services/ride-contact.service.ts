import { get, post, patch, del } from "@/lib/authFetch";

export interface RideContact {
  id: string;
  name: string;
  phone: string;
  label?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRideContactDto {
  name: string;
  phone: string;
  label?: string;
}

export interface UpdateRideContactDto {
  name?: string;
  phone?: string;
  label?: string;
}

export class RideContactService {
  static async list(): Promise<RideContact[]> {
    return get<RideContact[]>("ride-contacts");
  }

  static async create(data: CreateRideContactDto): Promise<RideContact> {
    return post<RideContact>("ride-contacts", data);
  }

  static async update(id: string, data: UpdateRideContactDto): Promise<RideContact> {
    return patch<RideContact>(`ride-contacts/${id}`, data);
  }

  static async remove(id: string): Promise<void> {
    return del(`ride-contacts/${id}`);
  }
}
