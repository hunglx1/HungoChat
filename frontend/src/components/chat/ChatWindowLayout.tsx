import { useEffect } from "react";
import { useChatStore } from "@/stores/useChatStore";
import ChatWelcomeScreen from "./ChatWelcomeScreen";
import ChatWindowHeader from "./ChatWindowHeader";
import ChatWindowBody from "./ChatWindowBody";
import MessageInput from "./MessageInput";
import ChatWindowSkeleton from "../skeleton/ChatWindowSkeleton";

export const ChatWindowLayout = () => {
  const {
    activeConversationId,
    conversations,
    messages,
    messageLoading: loading,
    markAsSeen,
  } = useChatStore();

  const selectedConvo =
    conversations.find((c) => c._id === activeConversationId) ?? null;

  useEffect(() => {
    if (!selectedConvo) return;

    const markSeen = async () => {
      try {
        await markAsSeen();
      } catch (error) {
        console.error("Lỗi khi đánh dấu đã xem", error);
      }
    };

    markSeen();
  }, [markAsSeen, selectedConvo]);

  if (!selectedConvo) {
    return <ChatWelcomeScreen />;
  }

  const activeMessages = activeConversationId
    ? messages[activeConversationId]?.items
    : undefined;

  if (loading && !activeMessages?.length) {
    return <ChatWindowSkeleton />;
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#0F1117] dark:bg-[#0F1117]">
      {/* 1. Chat Header */}
      <ChatWindowHeader chat={selectedConvo} />

      {/* 2. Message History Body */}
      <div className="flex-1 overflow-hidden">
        <ChatWindowBody />
      </div>

      {/* 3. Chat Input Footer */}
      <MessageInput selectedConvo={selectedConvo} />
    </div>
  );
};
export default ChatWindowLayout;
