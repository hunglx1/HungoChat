import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";
import { useSocketStore } from "@/stores/useSocketStore";
import type { Conversation } from "@/types/chat";
import { cn, formatOnlineTime } from "@/lib/utils";
import UserAvatar from "./UserAvatar";
import GroupChatAvatar from "./GroupChatAvatar";
import StatusBadge from "./StatusBadge";
import { Pin } from "lucide-react";

interface ConversationCardProps {
  convo: Conversation;
  isPinned?: boolean;
}

export const ConversationCard = ({ convo, isPinned }: ConversationCardProps) => {
  const { user } = useAuthStore();
  const {
    activeConversationId,
    setActiveConversation,
    messages,
    fetchMessages,
  } = useChatStore();
  const { onlineUsers } = useSocketStore();

  if (!user) return null;

  const isActive = activeConversationId === convo._id;
  const unreadCount = convo.unreadCounts?.[user._id] || 0;

  // Determine chat name, avatar, and other user
  const isDirect = convo.type === "direct";
  const otherUser = isDirect
    ? convo.participants.find((p) => p._id !== user._id)
    : null;

  const chatName = isDirect
    ? otherUser?.displayName || "Người dùng Hungo"
    : convo.group?.name || "Nhóm trò chuyện";

  const isOnline = isDirect && otherUser
    ? onlineUsers.includes(otherUser._id)
    : false;

  // Format last message preview
  const lastMsg = convo.lastMessage;
  let previewText = "Bắt đầu cuộc trò chuyện";

  if (lastMsg) {
    if (lastMsg.sender?._id === user._id) {
      previewText = `Bạn: ${lastMsg.content || lastMsg.imgUrl ? "📷 [Hình ảnh]" : ""}`;
    } else if (!isDirect && lastMsg.sender?.displayName) {
      previewText = `${lastMsg.sender.displayName}: ${lastMsg.content || ""}`;
    } else {
      previewText = lastMsg.content || "📷 [Hình ảnh]";
    }
  }

  const timestamp = convo.lastMessage?.createdAt || convo.updatedAt;

  const handleSelect = async () => {
    setActiveConversation(convo._id);
    if (messages[convo._id]?.nextCursor === undefined) {
      await fetchMessages(convo._id);
    }
  };

  return (
    <div
      onClick={handleSelect}
      className={cn(
        "group relative flex items-center gap-3 px-3 py-2.5 mx-1.5 rounded-xl cursor-pointer transition-all duration-150 select-none",
        isActive
          ? "bg-gradient-to-r from-indigo-500/18 via-violet-500/10 to-transparent border-l-[3.5px] border-indigo-500 text-white shadow-sm"
          : "hover:bg-[#1E2330]/80 text-slate-300 border-l-[3.5px] border-transparent"
      )}
    >
      {/* Left Avatar Section */}
      <div className="relative shrink-0">
        {isDirect ? (
          <>
            <UserAvatar
              type="sidebar"
              name={chatName}
              avatarUrl={otherUser?.avatarUrl || undefined}
              className="size-11 rounded-full ring-1 ring-border/30"
            />
            <StatusBadge status={isOnline ? "online" : "offline"} />
          </>
        ) : (
          <GroupChatAvatar
            participants={convo.participants}
            type="sidebar"
          />
        )}
      </div>

      {/* Middle Content Section */}
      <div className="flex-1 min-w-0">
        {/* Name and Timestamp */}
        <div className="flex items-center justify-between mb-1">
          <h4
            className={cn(
              "text-sm truncate font-medium",
              isActive ? "text-white font-semibold" : "text-slate-200",
              unreadCount > 0 && "font-bold text-white"
            )}
          >
            {chatName}
          </h4>

          <span className="text-[11px] text-slate-400 shrink-0 ml-1.5">
            {timestamp ? formatOnlineTime(new Date(timestamp)) : ""}
          </span>
        </div>

        {/* Subtitle / Last Message & Badges */}
        <div className="flex items-center justify-between gap-1.5">
          <p
            className={cn(
              "text-xs truncate max-w-[190px]",
              unreadCount > 0
                ? "text-slate-100 font-semibold"
                : "text-slate-400 group-hover:text-slate-300"
            )}
          >
            {previewText}
          </p>

          <div className="flex items-center gap-1 shrink-0">
            {isPinned && (
              <Pin className="size-3 text-indigo-400 fill-indigo-400/30" />
            )}

            {/* Unread Counter Badge */}
            {unreadCount > 0 && (
              <span className="min-w-4 h-4 px-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-[10px] font-bold text-white flex items-center justify-center shadow-md animate-in zoom-in-75">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default ConversationCard;
