import {
  Phone,
  Video,
  Pin,
  Search,
  PanelRight,
  ArrowLeft,
  Users,
} from "lucide-react";
import { useChatStore } from "@/stores/useChatStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSocketStore } from "@/stores/useSocketStore";
import { useVideoCallStore } from "@/stores/useVideoCallStore";
import { useLayoutStore } from "@/stores/useLayoutStore";
import type { Conversation } from "@/types/chat";
import UserAvatar from "./UserAvatar";
import GroupChatAvatar from "./GroupChatAvatar";
import StatusBadge from "./StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChatWindowHeaderProps {
  chat?: Conversation;
}

export const ChatWindowHeader = ({ chat }: ChatWindowHeaderProps) => {
  const { conversations, activeConversationId, setActiveConversation } =
    useChatStore();
  const { user } = useAuthStore();
  const { onlineUsers } = useSocketStore();
  const { startCall, status } = useVideoCallStore();
  const { isInfoSidebarOpen, toggleInfoSidebar, pinnedMessage, setPinnedMessage } =
    useLayoutStore();

  const selectedConvo =
    chat || conversations.find((c) => c._id === activeConversationId);

  if (!selectedConvo || !user) {
    return (
      <header className="h-14 px-4 border-b border-[#222735] bg-[#161922] flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-300">Tin nhắn Hungo</h2>
      </header>
    );
  }

  const isDirect = selectedConvo.type === "direct";
  const otherUser = isDirect
    ? selectedConvo.participants.find((p) => p._id !== user._id)
    : null;

  const chatName = isDirect
    ? otherUser?.displayName || "Người dùng Hungo"
    : selectedConvo.group?.name || "Nhóm trò chuyện";

  const isOnline = isDirect && otherUser
    ? onlineUsers.includes(otherUser._id)
    : false;

  const onlineInGroup = !isDirect
    ? selectedConvo.participants.filter((p) => onlineUsers.includes(p._id)).length
    : 0;

  const handleVoiceCall = () => {
    toast.info("Đang khởi tạo cuộc gọi thoại bảo mật...");
  };

  const handleTogglePinBanner = () => {
    if (pinnedMessage) {
      setPinnedMessage(null);
      toast.info("Đã đóng thông báo ghim");
    } else if (selectedConvo.lastMessage?.content) {
      setPinnedMessage(selectedConvo.lastMessage.content);
      toast.success("Đã ghim tin nhắn vào đầu hội thoại");
    } else {
      toast.info("Chưa có tin nhắn để ghim");
    }
  };

  return (
    <TooltipProvider delayDuration={150}>
      <header className="h-15 px-4 bg-[#161922] dark:bg-[#161922] border-b border-[#222735] flex items-center justify-between select-none shrink-0 z-10">
        {/* Left: Mobile back button, Avatar, Name & Status */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Back Button */}
          <button
            onClick={() => setActiveConversation(null)}
            className="md:hidden size-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#1F2430] transition-colors -ml-1"
            title="Quay lại danh sách chat"
          >
            <ArrowLeft className="size-5" />
          </button>

          {/* Avatar with Status Badge */}
          <div className="relative shrink-0">
            {isDirect ? (
              <>
                <UserAvatar
                  type="sidebar"
                  name={chatName}
                  avatarUrl={otherUser?.avatarUrl || undefined}
                  className="size-10 ring-1 ring-border/40"
                />
                <StatusBadge status={isOnline ? "online" : "offline"} />
              </>
            ) : (
              <GroupChatAvatar
                participants={selectedConvo.participants}
                type="sidebar"
              />
            )}
          </div>

          {/* Name & Online Status Description */}
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-xs md:max-w-md">
              {chatName}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              {isDirect ? (
                isOnline ? (
                  <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    Đang hoạt động
                  </span>
                ) : (
                  <span>Truy cập gần đây</span>
                )
              ) : (
                <span className="flex items-center gap-1.5">
                  <Users className="size-3 text-indigo-400" />
                  {selectedConvo.participants.length} thành viên
                  {onlineInGroup > 0 && (
                    <span className="text-emerald-400 ml-1">
                      ({onlineInGroup} trực tuyến)
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions (Voice Call, Video Call, Pin, Search, Toggle Info) */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Voice Call Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleVoiceCall}
                className="size-9 rounded-xl text-slate-400 hover:text-white hover:bg-[#1F2430] transition-colors"
              >
                <Phone className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-[#1F2430] text-slate-100 border-[#2B3245]">
              Cuộc gọi thoại
            </TooltipContent>
          </Tooltip>

          {/* Video Call Button */}
          {isDirect && otherUser && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={status !== "idle"}
                  onClick={async () => {
                    try {
                      await startCall(
                        selectedConvo._id,
                        otherUser._id,
                        otherUser.displayName
                      );
                    } catch (error) {
                      console.error("Không thể bắt đầu cuộc gọi video", error);
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "Không thể truy cập camera hoặc microphone"
                      );
                    }
                  }}
                  className="size-9 rounded-xl text-slate-400 hover:text-white hover:bg-[#1F2430] transition-colors"
                >
                  <Video className="size-4 text-indigo-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-[#1F2430] text-slate-100 border-[#2B3245]">
                Cuộc gọi video
              </TooltipContent>
            </Tooltip>
          )}

          {/* Pin Messages Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleTogglePinBanner}
                className={cn(
                  "size-9 rounded-xl text-slate-400 hover:text-white hover:bg-[#1F2430] transition-colors",
                  pinnedMessage && "text-indigo-400 bg-indigo-500/10"
                )}
              >
                <Pin className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-[#1F2430] text-slate-100 border-[#2B3245]">
              Ghim tin nhắn
            </TooltipContent>
          </Tooltip>

          {/* Search in Chat Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toast.info("Tìm kiếm tin nhắn trong hội thoại")}
                className="size-9 rounded-xl text-slate-400 hover:text-white hover:bg-[#1F2430] transition-colors hidden sm:flex"
              >
                <Search className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-[#1F2430] text-slate-100 border-[#2B3245]">
              Tìm tin nhắn
            </TooltipContent>
          </Tooltip>

          {/* Toggle Info Sidebar Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleInfoSidebar}
                className={cn(
                  "size-9 rounded-xl transition-all",
                  isInfoSidebarOpen
                    ? "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30"
                    : "text-slate-400 hover:text-white hover:bg-[#1F2430]"
                )}
              >
                <PanelRight className="size-4.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-[#1F2430] text-slate-100 border-[#2B3245]">
              {isInfoSidebarOpen ? "Ẩn thông tin hội thoại" : "Xem thông tin hội thoại"}
            </TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  );
};
export default ChatWindowHeader;
