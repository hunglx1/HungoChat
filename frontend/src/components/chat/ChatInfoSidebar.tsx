import { useState } from "react";
import {
  X,
  Bell,
  BellOff,
  Pin,
  Image as ImageIcon,
  FileText,
  Link2,
  Users,
  UserPlus,
  Trash2,
  LogOut,
  Ban,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { Conversation } from "@/types/chat";
import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";
import { useSocketStore } from "@/stores/useSocketStore";
import UserAvatar from "./UserAvatar";
import GroupChatAvatar from "./GroupChatAvatar";
import StatusBadge from "./StatusBadge";
import { toast } from "sonner";
import { cn, formatFileSize } from "@/lib/utils";
import { chatService } from "@/services/chatService";

interface ChatInfoSidebarProps {
  chat: Conversation;
  onClose: () => void;
}

export const ChatInfoSidebar = ({ chat, onClose }: ChatInfoSidebarProps) => {
  const { user } = useAuthStore();
  const { messages } = useChatStore();
  const { onlineUsers } = useSocketStore();

  const [isMuted, setIsMuted] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [openSection, setOpenSection] = useState<
    "media" | "files" | "links" | "members" | null
  >("media");

  if (!user) return null;

  const isDirect = chat.type === "direct";
  const otherUser = isDirect
    ? chat.participants.find((p) => p._id !== user._id)
    : null;

  const chatName = isDirect
    ? otherUser?.displayName || "Người dùng Hungo"
    : chat.group?.name || "Nhóm trò chuyện";

  const isOnline = isDirect && otherUser
    ? onlineUsers.includes(otherUser._id)
    : false;

  // Extract real shared media, files, and links strictly from conversation messages
  const convoMessages = messages[chat._id]?.items || [];

  const sharedImages = convoMessages
    .filter((m) => m.imgUrl || (m.content && /\.(jpeg|jpg|gif|png|webp)/i.test(m.content)))
    .map((m) => m.imgUrl || m.content || "")
    .filter(Boolean);

  const sharedFiles = convoMessages
    .filter(
      (m) =>
        m.fileUrl ||
        (m.content &&
          (m.content.includes("[file:") ||
            /\.(pdf|zip|rar|docx|xlsx|pptx|txt)$/i.test(m.content)))
    )
    .map((m) => {
      const raw = m.content || "";
      let name = m.fileName || raw.replace("[file:", "").replace("]", "").trim();
      let size = m.fileSize ? formatFileSize(m.fileSize) : "";
      if (!m.fileName && name.includes(",")) {
        const parts = name.split(",");
        name = parts[0].trim();
        size = parts[1]?.trim() || "";
      }
      return {
        id: m._id,
        name,
        size,
        hasFile: Boolean(m.fileUrl),
        date: new Date(m.createdAt).toLocaleDateString("vi-VN"),
      };
    });

  const handleDownloadFile = async (messageId: string, fileName: string) => {
    try {
      await chatService.downloadMessageFile(messageId, fileName);
    } catch (error) {
      console.error("Không thể tải tệp từ thông tin hội thoại", error);
      toast.error("Không thể tải tệp. Vui lòng thử lại.");
    }
  };

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const sharedLinks = convoMessages
    .filter((m) => m.content && urlRegex.test(m.content))
    .flatMap((m) => {
      const matches = m.content!.match(urlRegex) || [];
      return matches.map((url) => ({
        url,
        date: new Date(m.createdAt).toLocaleDateString("vi-VN"),
      }));
    });

  const toggleMute = () => {
    setIsMuted(!isMuted);
    toast.success(!isMuted ? "Đã tắt thông báo cuộc trò chuyện này" : "Đã bật thông báo cuộc trò chuyện");
  };

  const togglePin = () => {
    setIsPinned(!isPinned);
    toast.success(!isPinned ? "Đã ghim cuộc trò chuyện lên đầu" : "Đã bỏ ghim cuộc trò chuyện");
  };

  return (
    <div className="flex flex-col h-full bg-[#181B24] text-slate-200 select-none border-l border-[#262B35]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#262B35]">
        <h3 className="text-sm font-semibold text-white">Thông tin hội thoại</h3>
        <button
          onClick={onClose}
          className="size-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#202533] transition-colors"
          title="Đóng"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto beautiful-scrollbar p-4 space-y-5">
        {/* Profile Card */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="relative">
            {isDirect ? (
              <>
                <UserAvatar
                  type="profile"
                  name={chatName}
                  avatarUrl={otherUser?.avatarUrl || undefined}
                  className="size-20 ring-2 ring-indigo-500/40"
                />
                <StatusBadge status={isOnline ? "online" : "offline"} />
              </>
            ) : (
              <GroupChatAvatar
                participants={chat.participants}
                type="sidebar"
              />
            )}
          </div>

          <div>
            <h4 className="text-base font-bold text-white">{chatName}</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {isDirect
                ? isOnline ? "Đang hoạt động" : "Ngoại tuyến"
                : `${chat.participants.length} thành viên tham gia`}
            </p>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={toggleMute}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl text-xs transition-all w-20",
                isMuted
                  ? "bg-red-500/15 text-red-400"
                  : "bg-[#202533] text-slate-300 hover:text-white hover:bg-[#282F40]"
              )}
            >
              {isMuted ? <BellOff className="size-4 text-red-400" /> : <Bell className="size-4" />}
              <span className="text-[10px]">{isMuted ? "Bật chuông" : "Tắt thông báo"}</span>
            </button>

            <button
              onClick={togglePin}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl text-xs transition-all w-20",
                isPinned
                  ? "bg-indigo-500/20 text-indigo-400"
                  : "bg-[#202533] text-slate-300 hover:text-white hover:bg-[#282F40]"
              )}
            >
              <Pin className={cn("size-4", isPinned && "fill-indigo-400")} />
              <span className="text-[10px]">{isPinned ? "Bỏ ghim" : "Ghim hội thoại"}</span>
            </button>

            {!isDirect && (
              <button
                onClick={() => toast.info("Tính năng thêm thành viên")}
                className="flex flex-col items-center gap-1 p-2 rounded-xl text-xs bg-[#202533] text-slate-300 hover:text-white hover:bg-[#282F40] transition-all w-20"
              >
                <UserPlus className="size-4" />
                <span className="text-[10px]">Thêm bạn</span>
              </button>
            )}
          </div>
        </div>

        {/* Accordion / Content Sections */}
        <div className="space-y-3 pt-2">
          {/* 1. Media Section */}
          <div className="rounded-xl bg-[#1F2430]/70 border border-[#2B3245] overflow-hidden">
            <button
              onClick={() => setOpenSection(openSection === "media" ? null : "media")}
              className="w-full flex items-center justify-between p-3 text-xs font-semibold text-slate-200 hover:bg-[#252B3B] transition-colors"
            >
              <span className="flex items-center gap-2">
                <ImageIcon className="size-4 text-indigo-400" />
                Ảnh & Video đã chia sẻ ({sharedImages.length})
              </span>
              {openSection === "media" ? <ChevronDown className="size-4 text-slate-400" /> : <ChevronRight className="size-4 text-slate-400" />}
            </button>

            {openSection === "media" && (
              <div className="p-3 pt-0">
                {sharedImages.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    Chưa có ảnh hoặc video nào được chia sẻ
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {sharedImages.map((src, i) => (
                      <div
                        key={i}
                        className="relative aspect-square rounded-lg overflow-hidden border border-[#2B3245] group cursor-pointer"
                      >
                        <img
                          src={src}
                          alt="Shared media"
                          className="size-full object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Files Section */}
          <div className="rounded-xl bg-[#1F2430]/70 border border-[#2B3245] overflow-hidden">
            <button
              onClick={() => setOpenSection(openSection === "files" ? null : "files")}
              className="w-full flex items-center justify-between p-3 text-xs font-semibold text-slate-200 hover:bg-[#252B3B] transition-colors"
            >
              <span className="flex items-center gap-2">
                <FileText className="size-4 text-indigo-400" />
                Tài liệu & Tệp tin ({sharedFiles.length})
              </span>
              {openSection === "files" ? <ChevronDown className="size-4 text-slate-400" /> : <ChevronRight className="size-4 text-slate-400" />}
            </button>

            {openSection === "files" && (
              <div className="p-3 pt-0">
                {sharedFiles.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    Chưa có tệp tin nào được chia sẻ
                  </p>
                ) : (
                  <div className="space-y-2">
                    {sharedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#181B24] border border-[#2B3245] text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="size-4 text-indigo-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-slate-200 truncate">{file.name}</p>
                            <p className="text-[10px] text-slate-400">{file.size} • {file.date}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={!file.hasFile}
                          onClick={() => handleDownloadFile(file.id, file.name)}
                          className="size-7 rounded-md hover:bg-[#202533] text-slate-400 hover:text-white flex items-center justify-center shrink-0"
                          title={file.hasFile ? `Tải về ${file.name}` : "Tệp cũ chưa được tải lên máy chủ"}
                          aria-label={`Tải về ${file.name}`}
                        >
                          <Download className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Links Section */}
          <div className="rounded-xl bg-[#1F2430]/70 border border-[#2B3245] overflow-hidden">
            <button
              onClick={() => setOpenSection(openSection === "links" ? null : "links")}
              className="w-full flex items-center justify-between p-3 text-xs font-semibold text-slate-200 hover:bg-[#252B3B] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Link2 className="size-4 text-indigo-400" />
                Liên kết ({sharedLinks.length})
              </span>
              {openSection === "links" ? <ChevronDown className="size-4 text-slate-400" /> : <ChevronRight className="size-4 text-slate-400" />}
            </button>

            {openSection === "links" && (
              <div className="p-3 pt-0">
                {sharedLinks.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    Chưa có liên kết nào được chia sẻ
                  </p>
                ) : (
                  <div className="space-y-2">
                    {sharedLinks.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2 rounded-lg bg-[#181B24] border border-[#2B3245] text-xs hover:border-indigo-500/50 transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-medium text-indigo-400 truncate">{link.url}</p>
                          <p className="text-[10px] text-slate-400">{link.date}</p>
                        </div>
                        <ExternalLink className="size-3.5 text-slate-400 shrink-0" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Group Members Section (if group) */}
          {!isDirect && (
            <div className="rounded-xl bg-[#1F2430]/70 border border-[#2B3245] overflow-hidden">
              <button
                onClick={() => setOpenSection(openSection === "members" ? null : "members")}
                className="w-full flex items-center justify-between p-3 text-xs font-semibold text-slate-200 hover:bg-[#252B3B] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Users className="size-4 text-indigo-400" />
                  Thành viên nhóm ({chat.participants.length})
                </span>
                {openSection === "members" ? <ChevronDown className="size-4 text-slate-400" /> : <ChevronRight className="size-4 text-slate-400" />}
              </button>

              {openSection === "members" && (
                <div className="p-3 pt-0 space-y-2 max-h-48 overflow-y-auto beautiful-scrollbar">
                  {chat.participants.map((p) => {
                    const isCreator = p._id === chat.group?.createdBy;
                    const isSelf = p._id === user._id;
                    return (
                      <div
                        key={p._id}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[#181B24]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <UserAvatar
                            type="chat"
                            name={p.displayName}
                            avatarUrl={p.avatarUrl || undefined}
                            className="size-7"
                          />
                          <span className="text-xs text-slate-200 truncate">
                            {p.displayName} {isSelf && "(Bạn)"}
                          </span>
                        </div>
                        {isCreator && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400">
                            Trưởng nhóm
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Danger Options */}
        <div className="pt-3 space-y-1.5 border-t border-[#262B35]">
          <button
            onClick={() => toast.info("Lịch sử trò chuyện được lưu trữ an toàn")}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-[#202533] rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 className="size-4" />
            Xóa lịch sử trò chuyện
          </button>

          {!isDirect ? (
            <button
              onClick={() => toast.warning("Bạn đã nhấn rời nhóm")}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="size-4 text-red-400" />
              Rời khỏi nhóm
            </button>
          ) : (
            <button
              onClick={() => toast.warning("Đã chặn người dùng")}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
            >
              <Ban className="size-4 text-red-400" />
              Chặn người này
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
export default ChatInfoSidebar;
