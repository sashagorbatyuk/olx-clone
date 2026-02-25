import { http } from "./http";

export type OrderListItem = {
  id: string;
  adId: string;
  adTitle: string;
  buyerId: string;
  sellerId: string;
  status: number; // OrderStatus
  price: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

export type OrderDetails = OrderListItem & {
  buyerName: string;
  sellerName: string;
};

export type Shipping = {
  id: string | null;
  orderId: string;
  method: number; // 0 meetup, 1 post, 2 courier
  status: number; // 0 draft, 1 ready, 2 shipped, 3 delivered
  recipientName: string;
  recipientPhone: string;
  city: string;
  addressLine: string;
  carrier: string | null;
  trackingNumber: string | null;
};

export async function getOrderShipping(orderId: string) {
  const { data } = await http.get<Shipping>(`/orders/${orderId}/shipping`);
  return data;
}

export async function saveOrderShipping(orderId: string, payload: {
  method: number;
  recipientName: string;
  recipientPhone: string;
  city: string;
  addressLine: string;
  carrier?: string | null;
}) {
  await http.post(`/orders/${orderId}/shipping`, payload);
}

export async function markShipped(orderId: string, payload: { carrier?: string; trackingNumber?: string }) {
  await http.post(`/orders/${orderId}/shipping/mark-shipped`, payload);
}

export async function markDelivered(orderId: string) {
  await http.post(`/orders/${orderId}/shipping/mark-delivered`);
}

export async function createOrderByAd(adId: string) {
  const { data } = await http.post(`/orders/by-ad/${adId}`);
  return data as { id: string };
}

export async function getMyOrders() {
  const { data } = await http.get<OrderListItem[]>("/orders");
  return data;
}

export async function getOrder(id: string) {
  const { data } = await http.get<OrderDetails>(`/orders/${id}`);
  return data;
}

export async function acceptOrder(id: string) {
  await http.post(`/orders/${id}/accept`);
}

export async function rejectOrder(id: string) {
  await http.post(`/orders/${id}/reject`);
}

export async function cancelOrder(id: string) {
  await http.post(`/orders/${id}/cancel`);
}

export async function completeOrder(id: string) {
  await http.post(`/orders/${id}/complete`);
}