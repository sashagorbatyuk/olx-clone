import { http } from "./http";

export type SubscriptionStatus = { subscribed: boolean };

export type FollowedAd = {
  adId: string;
  title: string;
  price: number;
  currency: string;
  city: string;
  mainPhotoUrl: string | null;
  status: number;
  updatedAt: string;

  subscribedAt: string;
  lastSeenAt: string;
  hasUpdates: boolean;
};

export async function getSubscriptionStatus(adId: string) {
  const { data } = await http.get<SubscriptionStatus>(`/ads/${adId}/subscription`);
  return data;
}

export async function subscribeAd(adId: string) {
  await http.post(`/ads/${adId}/subscribe`, {});
}

export async function unsubscribeAd(adId: string) {
  await http.delete(`/ads/${adId}/subscribe`);
}

export async function getMyFollowedAds() {
  const { data } = await http.get<FollowedAd[]>(`/subscriptions/ads`);
  return data;
}

export async function markAdSeen(adId: string) {
  await http.post(`/subscriptions/ads/${adId}/seen`, {});
}