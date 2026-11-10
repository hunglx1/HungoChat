import api from "@/lib/axios";
import type { ConversationResponse, Message, Poll } from "@/types/chat";

interface FetchMessageProps {
  messages: Message[];
  cursor?: string;
}

const pageLimit = 50;

export const chatService = {
  async fetchConversations(): Promise<ConversationResponse> {
    const res = await api.get("/conversations");
    return res.data;
  },

  async fetchMessages(id: string, cursor?: string): Promise<FetchMessageProps> {
    const params = new URLSearchParams({ limit: String(pageLimit) });
    if (cursor) params.set("cursor", cursor);
    const res = await api.get(`/conversations/${id}/messages?${params.toString()}`);

    return { messages: res.data.messages, cursor: res.data.nextCursor };
  },

  async sendDirectMessage(
    recipientId: string,
    content: string = "",
    imgUrl?: string,
    conversationId?: string,
    clientMessageId?: string,
    file?: File
  ) {
    const data = file
      ? (() => {
          const formData = new FormData();
          formData.append("recipientId", recipientId);
          formData.append("content", content);
          if (conversationId) formData.append("conversationId", conversationId);
          if (clientMessageId) formData.append("clientMessageId", clientMessageId);
          formData.append("file", file);
          return formData;
        })()
      : { recipientId, content, imgUrl, conversationId, clientMessageId };
    const url = file
      ? `/messages/direct?recipientId=${encodeURIComponent(recipientId)}`
      : "/messages/direct";
    const res = await api.post(url, data);

    return res.data.message;
  },

  async sendGroupMessage(
    conversationId: string,
    content: string = "",
    imgUrl?: string,
    clientMessageId?: string,
    file?: File
  ) {
    const data = file
      ? (() => {
          const formData = new FormData();
          formData.append("conversationId", conversationId);
          formData.append("content", content);
          if (clientMessageId) formData.append("clientMessageId", clientMessageId);
          formData.append("file", file);
          return formData;
        })()
      : { conversationId, content, imgUrl, clientMessageId };
    const url = file
      ? `/messages/group?conversationId=${encodeURIComponent(conversationId)}`
      : "/messages/group";
    const res = await api.post(url, data);
    return res.data.message;
  },

  async createPoll(
    conversationId: string,
    question: string,
    options: string[],
    clientMessageId: string
  ): Promise<Message> {
    const res = await api.post(
      "/messages/group/poll",
      { conversationId, question, options, clientMessageId }
    );
    return res.data.message;
  },

  async votePoll(messageId: string, optionId: string): Promise<Poll> {
    const res = await api.post(`/messages/${messageId}/poll/vote`, { optionId });
    return res.data.poll;
  },

  async downloadMessageFile(messageId: string, fileName: string): Promise<void> {
    const res = await api.get(`/messages/${messageId}/file`, {
      responseType: "blob",
    });
    const objectUrl = URL.createObjectURL(res.data);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  },

  async markAsSeen(conversationId: string) {
    const res = await api.patch(`/conversations/${conversationId}/seen`);
    return res.data;
  },

  async createConversation(
    type: "direct" | "group",
    name: string,
    memberIds: string[]
  ) {
    const res = await api.post("/conversations", { type, name, memberIds });
    return res.data.conversation;
  },
};
