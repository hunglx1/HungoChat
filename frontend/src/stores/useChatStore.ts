import { chatService } from "@/services/chatService";
import type { ChatState } from "@/types/store";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "./useAuthStore";
import { useSocketStore } from "./useSocketStore";

const fetchingMessages = new Set<string>();

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      messages: {},
      messageErrors: {},
      activeConversationId: null,
      convoLoading: false, // convo loading
      messageLoading: false,
      loading: false,

      setActiveConversation: (id) => set({ activeConversationId: id }),
      reset: () => {
        set({
          conversations: [],
          messages: {},
          messageErrors: {},
          activeConversationId: null,
          convoLoading: false,
          messageLoading: false,
        });
      },
      fetchConversations: async () => {
        try {
          set({ convoLoading: true });
          const { conversations } = await chatService.fetchConversations();

          set({ conversations, convoLoading: false });
        } catch (error) {
          console.error("Lỗi xảy ra khi fetchConversations:", error);
          set({ convoLoading: false });
        }
      },
      fetchMessages: async (conversationId) => {
        const { activeConversationId, messages } = get();
        const { user } = useAuthStore.getState();

        const convoId = conversationId ?? activeConversationId;

        if (!convoId) return;

        const current = messages?.[convoId];
        const nextCursor =
          current?.nextCursor === undefined ? "" : current?.nextCursor;

        if (nextCursor === null || fetchingMessages.has(convoId)) return;
        fetchingMessages.add(convoId);

        set((state) => {
          const messageErrors = { ...state.messageErrors };
          delete messageErrors[convoId];
          return { messageLoading: true, messageErrors };
        });

        try {
          const { messages: fetched, cursor } = await chatService.fetchMessages(
            convoId,
            nextCursor
          );

          const processed = fetched.map((m) => ({
            ...m,
            isOwn: m.senderId === user?._id,
          }));

          set((state) => {
            const current = state.messages[convoId];
            const prev = current?.items ?? [];
            const merged = Array.from(
              new Map([...processed, ...prev].map((message) => [message._id, message])).values()
            ).sort(
              (a, b) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
                a._id.localeCompare(b._id)
            );

            return {
              messages: {
                ...state.messages,
                [convoId]: {
                  items: merged,
                  hasMore: !!cursor,
                  nextCursor: cursor ?? null,
                },
              },
            };
          });
        } catch (error) {
          console.error("Lỗi xảy ra khi fetchMessages:", error);
          const message =
            error instanceof Error
              ? error.message
              : "Không thể tải lịch sử tin nhắn. Vui lòng thử lại.";
          set((state) => ({
            messageErrors: { ...state.messageErrors, [convoId]: message },
          }));
          throw error;
        } finally {
          fetchingMessages.delete(convoId);
          set({ messageLoading: false });
        }
      },
      sendDirectMessage: async (recipientId, content, imgUrl, file) => {
        const clientMessageId = crypto.randomUUID();
        const { activeConversationId } = get();
        const { user } = useAuthStore.getState();

        if (activeConversationId && user) {
          await get().addMessage({
            _id: `optimistic:${clientMessageId}`,
            clientMessageId,
            conversationId: activeConversationId,
            senderId: user._id,
            content: content.trim() || null,
            imgUrl: imgUrl ?? null,
            fileName: file?.name ?? null,
            fileSize: file?.size ?? null,
            mimeType: file?.type ?? null,
            messageType: file ? (file.type.startsWith("image/") ? "image" : "file") : undefined,
            createdAt: new Date().toISOString(),
            isOwn: true,
          });
        }

        try {
          const message = await chatService.sendDirectMessage(
            recipientId,
            content,
            imgUrl,
            activeConversationId || undefined,
            clientMessageId,
            file
          );
          await get().addMessage({ ...message, clientMessageId, isOwn: true });
          set((state) => ({
            conversations: state.conversations.map((c) =>
              c._id === activeConversationId ? { ...c, seenBy: [] } : c
            ),
          }));
        } catch (error) {
          console.error("Lỗi xảy ra khi gửi direct message", error);
          if (activeConversationId) {
            get().removeOptimisticMessage(activeConversationId, clientMessageId);
          }
          throw error;
        }
      },
      sendGroupMessage: async (conversationId, content, imgUrl, file) => {
        const clientMessageId = crypto.randomUUID();
        const { user } = useAuthStore.getState();

        if (user) {
          await get().addMessage({
            _id: `optimistic:${clientMessageId}`,
            clientMessageId,
            conversationId,
            senderId: user._id,
            content: content.trim() || null,
            imgUrl: imgUrl ?? null,
            fileName: file?.name ?? null,
            fileSize: file?.size ?? null,
            mimeType: file?.type ?? null,
            messageType: file ? (file.type.startsWith("image/") ? "image" : "file") : undefined,
            createdAt: new Date().toISOString(),
            isOwn: true,
          });
        }

        try {
          const message = await chatService.sendGroupMessage(
            conversationId,
            content,
            imgUrl,
            clientMessageId,
            file
          );
          await get().addMessage({ ...message, clientMessageId, isOwn: true });
          set((state) => ({
            conversations: state.conversations.map((c) =>
              c._id === get().activeConversationId ? { ...c, seenBy: [] } : c
            ),
          }));
        } catch (error) {
          console.error("Lỗi xảy ra gửi group message", error);
          get().removeOptimisticMessage(conversationId, clientMessageId);
          throw error;
        }
      },
      createPoll: async (conversationId, question, options) => {
        const clientMessageId = crypto.randomUUID();
        const conversation = get().conversations.find(
          (item) => item._id === conversationId
        );
        if (!conversation) throw new Error("Không tìm thấy cuộc trò chuyện");
        if (conversation.type !== "group") {
          throw new Error("Chỉ có thể tạo bình chọn trong nhóm");
        }

        const message = await chatService.createPoll(
          conversationId,
          question,
          options,
          clientMessageId
        );
        await get().addMessage({ ...message, clientMessageId });
      },
      votePoll: async (messageId, optionId) => {
        const poll = await chatService.votePoll(messageId, optionId);
        get().updateMessagePoll(messageId, poll);
      },
      updateMessagePoll: (messageId, poll) => {
        set((state) => {
          let changed = false;
          const messages = Object.fromEntries(
            Object.entries(state.messages).map(([conversationId, messageState]) => {
              const items = messageState.items.map((message) => {
                if (message._id !== messageId) return message;
                changed = true;
                return {
                  ...message,
                  poll: {
                    ...poll,
                    selectedOptionId:
                      poll.selectedOptionId ?? message.poll?.selectedOptionId ?? null,
                  },
                };
              });
              return [conversationId, { ...messageState, items }];
            })
          );
          return changed ? { messages } : state;
        });
      },
      addMessage: async (message) => {
        const { user } = useAuthStore.getState();
        const convoId = message.conversationId;
        const incoming = { ...message, isOwn: message.senderId === user?._id };

        set((state) => {
          const current = state.messages[convoId];
          const items = current?.items ?? [];
          const withoutOptimistic = incoming.clientMessageId
            ? items.filter((item) => item.clientMessageId !== incoming.clientMessageId)
            : items;
          if (withoutOptimistic.some((item) => item._id === incoming._id)) {
            if (withoutOptimistic.length === items.length) return state;
            return {
              messages: {
                ...state.messages,
                [convoId]: {
                  ...current,
                  items: withoutOptimistic,
                },
              },
            };
          }

          return {
            messages: {
              ...state.messages,
              [convoId]: {
                items: [...withoutOptimistic, incoming],
                hasMore: current?.hasMore ?? false,
                nextCursor: current?.nextCursor,
              },
            },
          };
        });
      },
      removeOptimisticMessage: (conversationId, clientMessageId) => {
        set((state) => {
          const current = state.messages[conversationId];
          if (!current) return state;

          return {
            messages: {
              ...state.messages,
              [conversationId]: {
                ...current,
                items: current.items.filter(
                  (message) =>
                    message.clientMessageId !== clientMessageId ||
                    !message._id.startsWith("optimistic:")
                ),
              },
            },
          };
        });
      },
      updateConversation: (conversation) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c._id === conversation._id ? { ...c, ...conversation } : c
          ),
        }));
      },
      markAsSeen: async () => {
        try {
          const { user } = useAuthStore.getState();
          const { activeConversationId, conversations } = get();

          if (!activeConversationId || !user) {
            return;
          }

          const convo = conversations.find((c) => c._id === activeConversationId);

          if (!convo) {
            return;
          }

          if ((convo.unreadCounts?.[user._id] ?? 0) === 0) {
            return;
          }

          await chatService.markAsSeen(activeConversationId);

          set((state) => ({
            conversations: state.conversations.map((c) =>
              c._id === activeConversationId && c.lastMessage
                ? {
                    ...c,
                    unreadCounts: {
                      ...c.unreadCounts,
                      [user._id]: 0,
                    },
                  }
                : c
            ),
          }));
        } catch (error) {
          console.error("Lỗi xảy ra khi gọi markAsSeen trong store", error);
        }
      },
      addConvo: (convo) => {
        set((state) => {
          const exists = state.conversations.some(
            (c) => c._id.toString() === convo._id.toString()
          );

          return {
            conversations: exists
              ? state.conversations
              : [convo, ...state.conversations],
            activeConversationId: convo._id,
          };
        });
      },
      createConversation: async (type, name, memberIds) => {
        try {
          set({ loading: true });
          const conversation = await chatService.createConversation(
            type,
            name,
            memberIds
          );

          get().addConvo(conversation);

          useSocketStore
            .getState()
            .socket?.emit("join-conversation", conversation._id);
        } catch (error) {
          console.error("Lỗi xảy ra khi gọi createConversation trong store", error);
        } finally {
          set({ loading: false });
        }
      },
    }),
    {
      name: "chat-storage",
      partialize: (state) => ({ conversations: state.conversations }),
    }
  )
);
