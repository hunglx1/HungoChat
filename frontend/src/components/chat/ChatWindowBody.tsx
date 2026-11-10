import { useEffect, useLayoutEffect, useRef, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { Pin, X, MessageSquareDashed } from "lucide-react";
import { useChatStore } from "@/stores/useChatStore";
import { useLayoutStore } from "@/stores/useLayoutStore";
import MessageItem from "./MessageItem";
import ChatWelcomeScreen from "./ChatWelcomeScreen";

export const ChatWindowBody = () => {
  const {
    activeConversationId,
    conversations,
    messages: allMessages,
    fetchMessages,
    messageLoading,
    messageErrors,
  } = useChatStore();
  const { pinnedMessage, setPinnedMessage } = useLayoutStore();

  const [lastMessageStatus, setLastMessageStatus] = useState<"delivered" | "seen">(
    "delivered"
  );

  const messages = allMessages[activeConversationId!]?.items ?? [];
  const reversedMessages = [...messages].reverse();
  const hasMore = allMessages[activeConversationId!]?.hasMore ?? false;
  const selectedConvo = conversations.find((c) => c._id === activeConversationId);
  const scrollKey = `chat-scroll-${activeConversationId}`;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      !activeConversationId ||
      allMessages[activeConversationId]?.nextCursor !== undefined
    ) {
      return;
    }

    fetchMessages(activeConversationId).catch(() => {
      // The error is shown in the empty-state panel below.
    });
  }, [activeConversationId, allMessages, fetchMessages]);

  // Update seen/delivered status
  useEffect(() => {
    const lastMessage = selectedConvo?.lastMessage;
    if (!lastMessage) return;

    const seenBy = selectedConvo?.seenBy ?? [];
    setLastMessageStatus(seenBy.length > 0 ? "seen" : "delivered");
  }, [selectedConvo]);

  // Scroll to bottom when conversation loads
  useLayoutEffect(() => {
    if (!messagesEndRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeConversationId]);

  const fetchMoreMessages = async () => {
    if (!activeConversationId) return;
    try {
      await fetchMessages(activeConversationId);
    } catch (error) {
      console.error("Lỗi khi tải thêm tin nhắn", error);
    }
  };

  const handleScrollSave = () => {
    const container = containerRef.current;
    if (!container || !activeConversationId) return;

    sessionStorage.setItem(
      scrollKey,
      JSON.stringify({
        scrollTop: container.scrollTop,
        scrollHeight: container.scrollHeight,
      })
    );
  };

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const saved = sessionStorage.getItem(scrollKey);
    if (saved) {
      const { scrollTop } = JSON.parse(saved);
      requestAnimationFrame(() => {
        container.scrollTop = scrollTop;
      });
    }
  }, [messages.length, scrollKey]);

  if (!selectedConvo) {
    return <ChatWelcomeScreen />;
  }

  const messageError = activeConversationId
    ? messageErrors[activeConversationId]
    : undefined;

  return (
    <div className="relative flex-1 h-full flex flex-col bg-[#0F1117] dark:bg-[#0F1117] overflow-hidden">
      {/* Pinned Message Sticky Banner */}
      {pinnedMessage && (
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 bg-[#181B24]/90 backdrop-blur-md border-b border-[#262B35] text-xs text-slate-200 animate-in fade-in-50">
          <div className="flex items-center gap-2 min-w-0">
            <Pin className="size-3.5 text-indigo-400 shrink-0 fill-indigo-400/30" />
            <span className="font-semibold text-indigo-400 shrink-0">Tin đã ghim:</span>
            <span className="truncate text-slate-300">{pinnedMessage}</span>
          </div>
          <button
            onClick={() => setPinnedMessage(null)}
            className="size-5 rounded flex items-center justify-center text-slate-400 hover:text-white shrink-0 ml-2"
            title="Đóng ghim"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-hidden p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
            {messageLoading ? (
              <p className="text-sm text-slate-300">Đang tải lịch sử tin nhắn...</p>
            ) : messageError ? (
              <>
                <p className="text-sm text-red-300">{messageError}</p>
                <button
                  type="button"
                  onClick={() => fetchMessages(activeConversationId!).catch(() => {})}
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-500"
                >
                  Thử tải lại
                </button>
              </>
            ) : (
              <>
                <div className="size-14 rounded-2xl bg-[#181B24] border border-[#262B35] flex items-center justify-center text-indigo-400 shadow-md">
                  <MessageSquareDashed className="size-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    Chưa có tin nhắn nào trong cuộc trò chuyện này
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Gửi tin nhắn hoặc lời chào đầu tiên để bắt đầu kết nối!
                  </p>
                </div>
              </>
            )}
          </div>
        ) : (
          <div
            id="scrollableDiv"
            ref={containerRef}
            onScroll={handleScrollSave}
            className="h-full flex flex-col-reverse overflow-y-auto overflow-x-hidden beautiful-scrollbar px-1"
          >
            <div ref={messagesEndRef} />
            <InfiniteScroll
              dataLength={messages.length}
              next={fetchMoreMessages}
              hasMore={hasMore}
              scrollableTarget="scrollableDiv"
              loader={
                <p className="text-xs text-center text-slate-500 py-2">
                  Đang tải tin nhắn cũ...
                </p>
              }
              inverse={true}
              style={{
                display: "flex",
                flexDirection: "column-reverse",
                overflow: "visible",
              }}
            >
              {reversedMessages.map((message, index) => (
                <MessageItem
                  key={message._id ?? index}
                  message={message}
                  index={index}
                  messages={reversedMessages}
                  selectedConvo={selectedConvo}
                  lastMessageStatus={lastMessageStatus}
                />
              ))}
            </InfiniteScroll>
          </div>
        )}
      </div>
    </div>
  );
};
export default ChatWindowBody;
