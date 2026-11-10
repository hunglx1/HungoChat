import { useMemo } from "react";
import { Search, X, MessageSquareDashed } from "lucide-react";
import { useChatStore } from "@/stores/useChatStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useLayoutStore, type ChatFilter } from "@/stores/useLayoutStore";
import ConversationCard from "@/components/chat/ConversationCard";
import ConversationSkeleton from "@/components/skeleton/ConversationSkeleton";
import AddFriendModal from "@/components/chat/AddFriendModal";
import NewGroupChatModal from "@/components/chat/NewGroupChatModal";
import { cn } from "@/lib/utils";

export const ConversationSidebar = () => {
  const { conversations, convoLoading } = useChatStore();
  const { user } = useAuthStore();
  const { chatFilter, setChatFilter, searchQuery, setSearchQuery } =
    useLayoutStore();

  // Filter conversations based on search and active tab
  const filteredConversations = useMemo(() => {
    if (!conversations || !user) return [];

    let list = [...conversations];

    // Filter by tab
    if (chatFilter === "unread") {
      list = list.filter((c) => (c.unreadCounts?.[user._id] || 0) > 0);
    } else if (chatFilter === "groups") {
      list = list.filter((c) => c.type === "group");
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((c) => {
        if (c.type === "direct") {
          const other = c.participants.find((p) => p._id !== user._id);
          const nameMatches = other?.displayName.toLowerCase().includes(q);
          const msgMatches = c.lastMessage?.content?.toLowerCase().includes(q);
          return nameMatches || msgMatches;
        } else {
          const groupNameMatches = c.group?.name.toLowerCase().includes(q);
          const memberMatches = c.participants.some((p) =>
            p.displayName.toLowerCase().includes(q)
          );
          const msgMatches = c.lastMessage?.content?.toLowerCase().includes(q);
          return groupNameMatches || memberMatches || msgMatches;
        }
      });
    }

    // Sort by most recent
    return list.sort((a, b) => {
      const timeA = new Date(a.lastMessageAt || a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.lastMessageAt || b.updatedAt || b.createdAt).getTime();
      return timeB - timeA;
    });
  }, [conversations, chatFilter, searchQuery, user]);

  // Counts for tabs
  const unreadCountTotal = useMemo(() => {
    if (!user || !conversations) return 0;
    return conversations.filter((c) => (c.unreadCounts?.[user._id] || 0) > 0).length;
  }, [conversations, user]);

  const groupCountTotal = useMemo(() => {
    if (!conversations) return 0;
    return conversations.filter((c) => c.type === "group").length;
  }, [conversations]);

  const filterTabs: { id: ChatFilter; label: string; count?: number }[] = [
    { id: "all", label: "Tất cả" },
    { id: "unread", label: "Chưa đọc", count: unreadCountTotal },
    { id: "groups", label: "Nhóm", count: groupCountTotal },
  ];

  return (
    <div className="flex flex-col h-full bg-[#161922] dark:bg-[#161922] select-none">
      {/* Top Search & Action Bar */}
      <div className="p-3 pb-2 space-y-2.5 border-b border-[#222735]">
        <div className="flex items-center justify-between gap-2">
          {/* Search Input Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm cuộc trò chuyện..."
              className="w-full h-9 pl-9 pr-8 text-xs bg-[#1F2430] border border-[#2B3245] text-slate-100 placeholder:text-slate-400 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Quick Action Modals */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Add Friend Trigger */}
            <div title="Thêm bạn bè">
              <AddFriendModal />
            </div>

            {/* New Group Chat Trigger */}
            <div title="Tạo nhóm trò chuyện">
              <NewGroupChatModal />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 pt-0.5">
          {filterTabs.map((tab) => {
            const isActive = chatFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setChatFilter(tab.id)}
                className={cn(
                  "relative px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1.5 cursor-pointer",
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-[#1E2330]"
                )}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-indigo-500/20 text-indigo-400"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversation Cards List */}
      <div className="flex-1 overflow-y-auto beautiful-scrollbar py-2 space-y-0.5">
        {convoLoading ? (
          <ConversationSkeleton />
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 px-4 text-center">
            <div className="size-12 rounded-2xl bg-[#1F2430] border border-[#2B3245] flex items-center justify-center text-slate-400 mb-3">
              <MessageSquareDashed className="size-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-300">
              {searchQuery
                ? "Không tìm thấy cuộc trò chuyện nào"
                : chatFilter === "unread"
                ? "Không có tin nhắn chưa đọc"
                : chatFilter === "groups"
                ? "Bạn chưa tham gia nhóm nào"
                : "Chưa có cuộc trò chuyện nào"}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
              {searchQuery
                ? "Hãy thử tìm kiếm với tên hoặc nội dung khác"
                : "Kết bạn hoặc tạo nhóm mới để bắt đầu chat"}
            </p>
          </div>
        ) : (
          filteredConversations.map((convo) => (
            <ConversationCard key={convo._id} convo={convo} />
          ))
        )}
      </div>
    </div>
  );
};
export default ConversationSidebar;
