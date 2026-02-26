export type AdCondition = 0 | 1; // 0=new, 1=used (під твій enum)

export type AdsListItem = {
  id: string;
  title: string;
  price: number;
  currency: string;
  city: string;
  condition: AdCondition;
  createdAt: string;
  mainPhotoUrl: string | null;
  categoryName?: string | null;
};

export type AdsListResponse = {
  count: number;
  items: AdsListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  
};

export type AdDetails = {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  city: string;
  condition: AdCondition;
  createdAt: string;
  photos: { id: string; url: string; sortOrder: number }[];
};

export type UpsertAdRequest = {
  categoryId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  city: string;
  condition: AdCondition;
};

export type CreateAdResponse = {
  id: string;
};