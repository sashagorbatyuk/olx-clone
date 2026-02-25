import { http } from "./http";

export type ChatListItem = {
  id: string;
  adId: string;
  adTitle: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatarUrl?: string | null;
  lastMessageText?: string | null;
  lastMessageAt?: string | null;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
};

export type ChatDetails = {
  id: string;
  adId: string;
  adTitle: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatarUrl?: string | null;
  messages: ChatMessage[];
};

export async function getMyChats(includeEmpty = false) {
  const { data } = await http.get<ChatListItem[]>("/chats", { params: { includeEmpty } });
  return data;
}

export async function createOrGetChatByAd(adId: string) {
  const { data } = await http.post<{ id: string }>(`/chats/by-ad/${adId}`, {});
  return data;
}

export async function getChat(id: string) {
  const { data } = await http.get<ChatDetails>(`/chats/${id}`);
  return data;
}

export async function sendMessage(chatId: string, text: string) {
  const { data } = await http.post<ChatMessage>(`/chats/${chatId}/messages`, { text });
  return data;
}