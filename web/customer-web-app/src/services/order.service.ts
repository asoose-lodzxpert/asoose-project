import { ApiService } from "./api.service";

export interface CustomerOrderItem {
  id: string;
  menuItemId: string | null;
  productId: string | null;
  name: string;
  quantity: number;
  price: number;
  instructions: string | null;
  image: string | null;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod: "CARD" | "WALLET";
  paymentStatus: string;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  vat: number;
  discount: number;
  total: number;
  deliveryNote: string | null;
  alternatePhone: string | null;
  deliveryAddressId: string;
  restaurantId: string | null;
  restaurantName: string | null;
  storeId: string | null;
  storeName: string | null;
  items: CustomerOrderItem[];
  createdAt: string;
  updatedAt: string;
  estimatedDeliveryAt: string | null;
  actualDeliveryAt: string | null;
  workflowUpdates: Array<{
    id?: string;
    status?: string;
    message?: string;
    createdAt?: string;
  }>;
}

export interface OrdersResult {
  orders: CustomerOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface OrderDeliveryCode {
  orderId: string;
  orderNumber: string;
  deliveryCode: string;
}

export class OrderService {
  static getOrders(page = 1, limit = 20, token?: string) {
    return ApiService.get<OrdersResult>(
      `/orders?page=${page}&limit=${limit}`,
      token,
    );
  }

  static getOrder(orderId: string, token?: string) {
    return ApiService.get<CustomerOrder>(`/orders/${orderId}`, token);
  }

  static getDeliveryCode(orderId: string, token?: string) {
    return ApiService.get<OrderDeliveryCode>(
      `/orders/${orderId}/delivery-code`,
      token,
    );
  }
}
