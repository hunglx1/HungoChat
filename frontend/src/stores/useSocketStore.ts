import { create } from "zustand";
import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "./useAuthStore";
import type { SocketState } from "@/types/store";
import { useChatStore } from "./useChatStore";
import { useVideoCallStore } from "./useVideoCallStore";
import { useFriendStore } from "./useFriendStore";

const baseURL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.DEV ? "http://localhost:5001" : window.location.origin);

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  onlineUsers: [],
  connectSocket: async () => {
    let accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) {
      await useAuthStore.getState().refresh();
      accessToken = useAuthStore.getState().accessToken;
    }
    if (!accessToken) return;
    const existingSocket = get().socket;

    if (existingSocket) {
      const currentAuthToken =
        typeof existingSocket.auth === "object"
          ? (existingSocket.auth as { token?: string }).token
          : undefined;
      if (existingSocket.disconnected || currentAuthToken !== accessToken) {
        existingSocket.auth = { token: accessToken };
        if (existingSocket.connected) {
          existingSocket.disconnect();
        }
        existingSocket.connect();
      }
      return;
    }

    const socket: Socket = io(baseURL, {
      auth: { token: accessToken },
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      timeout: 10000,
    });

    set({ socket });
    useVideoCallStore.getState().registerSocket(socket);

    socket.on("connect", () => {
      console.log("Đã kết nối với socket");
    });

    socket.on("connect_error", (error) => {
      console.error("Không thể kết nối Socket.IO:", error.message);
    });

    // online users
    socket.on("online-users", (userIds) => {
      set({ onlineUsers: userIds });
    });

    // new message
    socket.on("new-message", ({ message, conversation, unreadCounts, clientMessageId }) => {
      useChatStore.getState().addMessage({ ...message, clientMessageId });

      const lastMessage = {
        _id: conversation.lastMessage._id,
        content: conversation.lastMessage.content,
        fileName: conversation.lastMessage.fileName,
        messageType: conversation.lastMessage.messageType,
        poll: conversation.lastMessage.poll,
        createdAt: conversation.lastMessage.createdAt,
        sender: {
          _id: conversation.lastMessage.senderId,
          displayName: "",
          avatarUrl: null,
        },
      };

      const updatedConversation = {
        ...conversation,
        lastMessage,
        unreadCounts,
      };

      if (useChatStore.getState().activeConversationId === message.conversationId) {
        useChatStore.getState().markAsSeen();
      }

      useChatStore.getState().updateConversation(updatedConversation);
    });

    socket.on("poll-updated", ({ messageId, poll }) => {
      useChatStore.getState().updateMessagePoll(messageId, poll);
    });

    socket.on("poll-vote-selection", ({ messageId, selectedOptionId }) => {
      const { messages, updateMessagePoll } = useChatStore.getState();
      const message = Object.values(messages)
        .flatMap((conversationMessages) => conversationMessages.items)
        .find((item) => item._id === messageId);
      if (message?.poll) {
        updateMessagePoll(messageId, { ...message.poll, selectedOptionId });
      }
    });

    socket.on("friend-request:accepted", () => {
      useFriendStore.getState().getFriends().catch(() => {});
      useFriendStore.getState().getAllFriendRequests().catch(() => {});
    });

    // read message
    socket.on("read-message", ({ conversation, lastMessage }) => {
      const updated = {
        _id: conversation._id,
        lastMessage,
        lastMessageAt: conversation.lastMessageAt,
        unreadCounts: conversation.unreadCounts,
        seenBy: conversation.seenBy,
      };

      useChatStore.getState().updateConversation(updated);
    });

    // new group chat
    socket.on("new-group", (conversation) => {
      useChatStore.getState().addConvo(conversation);
      socket.emit("join-conversation", conversation._id);
    });
  },
  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      useVideoCallStore.getState().reset();
      socket.disconnect();
      set({ socket: null });
    }
  },
}));
