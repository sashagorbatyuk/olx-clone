import { http } from "./http";

export type MyOrderReview =
  | {
      id: string;
      rating: number;
      comment: string;
      createdAt: string;
      rateeId: string;
    }
  | null;

export async function getMyReview(orderId: string) {
  const { data } = await http.get<MyOrderReview>(`/orders/${orderId}/review`);
  return data;
}

export async function createReview(orderId: string, payload: { rating: number; comment: string }) {
  const { data } = await http.post(`/orders/${orderId}/review`, payload);
  return data;
}