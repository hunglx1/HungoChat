import { useState } from "react";
import {
  Check,
  CheckCheck,
  Download,
  FileText,
  FileSpreadsheet,
  Archive,
  File,
  Code2,
  Copy,
  ZoomIn,
} from "lucide-react";
import type { Conversation, Message, Participant } from "@/types/chat";
import {
  cn,
  formatDateSeparator,
  formatFileSize,
  formatMessageTime,
} from "@/lib/utils";
import UserAvatar from "./UserAvatar";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useChatStore } from "@/stores/useChatStore";
import { chatService } from "@/services/chatService";

interface MessageItemProps {
  message: Message;
  index: number;
  messages: Message[];
  selectedConvo: Conversation;
  lastMessageStatus: "delivered" | "seen";
}

export const MessageItem = ({
  message,
  index,
  messages,
  selectedConvo,
  lastMessageStatus,
}: MessageItemProps) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [reactions, setReactions] = useState<string[]>([]);
  const [isVoting, setIsVoting] = useState(false);
  const votePoll = useChatStore((state) => state.votePoll);

  if (selectedConvo.type === "direct" && message.poll) {
    return null;
  }

  // Note: messages array is in chronological order (or reversed in infinite scroll)
  // Let's determine if this message needs a date separator compared to the previous message in chronological flow
  const prevMsg = index > 0 ? messages[index - 1] : undefined;

  const msgDate = new Date(message.createdAt);
  const prevDate = prevMsg ? new Date(prevMsg.createdAt) : null;

  const showDateSeparator =
    !prevDate || msgDate.toDateString() !== prevDate.toDateString();

  const isGroupBreak =
    !prevMsg ||
    showDateSeparator ||
    prevMsg.senderId !== message.senderId;

  const participant = selectedConvo.participants.find(
    (p: Participant) => p._id.toString() === message.senderId.toString()
  );

  const senderName = participant?.displayName || "Thành viên";

  // Check if content is a code snippet (wrapped in ```)
  const isCodeSnippet =
    message.content &&
    message.content.startsWith("```") &&
    message.content.endsWith("```");

  const cleanCodeContent = isCodeSnippet
    ? message.content!.slice(3, -3).trim()
    : "";

  // Check if content represents a file attachment
  const isFileAttachment =
    Boolean(message.fileUrl || message.fileName) ||
    Boolean(
      message.content &&
        (message.content.includes("[file:") ||
          /\.(pdf|zip|rar|docx|xlsx|pptx)$/i.test(message.content))
    );

  // Determine file icon and info
  const getFileInfo = (content: string | null) => {
    let name =
      message.fileName ||
      content?.replace("[file:", "").replace("]", "").trim() ||
      "Tệp đính kèm";
    let size = message.fileSize ? formatFileSize(message.fileSize) : "";
    if (!message.fileName && name.includes(",")) {
      const parts = name.split(",");
      name = parts[0].trim();
      size = parts[1]?.trim() || "";
    }

    let Icon = File;
    if (/\.(pdf)$/i.test(name)) Icon = FileText;
    else if (/\.(zip|rar|tar)$/i.test(name)) Icon = Archive;
    else if (/\.(xls|xlsx|csv)$/i.test(name)) Icon = FileSpreadsheet;

    return { name, size, Icon };
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success("Đã sao chép đoạn mã");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAddReaction = (emoji: string) => {
    if (reactions.includes(emoji)) {
      setReactions(reactions.filter((r) => r !== emoji));
    } else {
      setReactions([...reactions, emoji]);
    }
  };

  const handleVote = async (optionId: string) => {
    if (!message.poll || isVoting) return;
    setIsVoting(true);
    try {
      await votePoll(message._id, optionId);
    } catch (error) {
      console.error("Không thể ghi nhận phiếu bình chọn", error);
      toast.error("Không thể ghi nhận bình chọn. Vui lòng thử lại.");
    } finally {
      setIsVoting(false);
    }
  };

  const handleDownload = async (fileName: string) => {
    try {
      await chatService.downloadMessageFile(message._id, fileName);
    } catch (error) {
      console.error("Không thể tải tệp đính kèm", error);
      toast.error("Không thể tải tệp. Vui lòng thử lại.");
    }
  };

  const isLastMessage =
    message._id === selectedConvo.lastMessage?._id ||
    index === messages.length - 1;

  return (
    <div className="flex flex-col space-y-1.5 my-1">
      {/* 1. Date Separator Badge */}
      {showDateSeparator && (
        <div className="flex items-center justify-center my-3 select-none">
          <span className="px-3.5 py-1 rounded-full text-[11px] font-semibold bg-[#1F2430]/90 text-slate-400 border border-[#2B3245]/70 shadow-sm">
            {formatDateSeparator(msgDate)}
          </span>
        </div>
      )}

      {/* 2. Message Row */}
      <div
        className={cn(
          "group relative flex items-end gap-2 message-bounce",
          message.isOwn ? "justify-end" : "justify-start"
        )}
      >
        {/* Incoming: Avatar */}
        {!message.isOwn && (
          <div className="size-8 shrink-0 mb-1">
            {isGroupBreak ? (
              <UserAvatar
                type="chat"
                name={senderName}
                avatarUrl={participant?.avatarUrl || undefined}
                className="size-8 ring-1 ring-border/30"
              />
            ) : (
              <div className="size-8" />
            )}
          </div>
        )}

        {/* Floating Quick Reaction Pill on Hover */}
        <div
          className={cn(
            "absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-[#1F2430] border border-[#2B3245] shadow-lg",
            message.isOwn ? "right-2" : "left-10"
          )}
        >
          {["👍", "❤️", "😂", "😮", "😢"].map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleAddReaction(emoji)}
              className="text-xs hover:scale-125 transition-transform p-0.5 cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Message Container */}
        <div
          className={cn(
            "max-w-[85%] sm:max-w-md lg:max-w-lg space-y-1 flex flex-col",
            message.isOwn ? "items-end" : "items-start"
          )}
        >
          {/* Sender name for group chats */}
          {!message.isOwn && selectedConvo.type === "group" && isGroupBreak && (
            <span className="text-[11px] font-semibold text-indigo-400 px-1">
              {senderName}
            </span>
          )}

          {/* Image Attachment Preview */}
          {message.imgUrl && (
            <div
              onClick={() => setSelectedImage(message.imgUrl!)}
              className="relative max-w-xs sm:max-w-sm rounded-2xl overflow-hidden border border-[#2B3245] group/img cursor-pointer shadow-md"
            >
              <img
                src={message.imgUrl}
                alt="Hình ảnh tin nhắn"
                className="w-full h-auto max-h-72 object-cover transition-transform group-hover/img:scale-102"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                <span className="p-2 rounded-full bg-black/60 text-white">
                  <ZoomIn className="size-5" />
                </span>
              </div>
            </div>
          )}

          {/* Code Snippet Preview */}
          {message.poll && selectedConvo.type === "group" ? (
            <div className="w-full min-w-[260px] rounded-2xl border border-[#2B3245] bg-[#1E222D] p-4 shadow-md">
              <div className="mb-3 flex items-center gap-2 text-indigo-300">
                <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-500/15">
                  <span className="text-sm font-bold">?</span>
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide">
                  Bình chọn
                </span>
              </div>
              <h3 className="mb-3 text-sm font-semibold text-slate-100">
                {message.poll.question}
              </h3>
              <div className="space-y-2">
                {message.poll.options.map((option) => {
                  const percentage = message.poll!.totalVotes
                    ? Math.round((option.voteCount / message.poll!.totalVotes) * 100)
                    : 0;
                  const isSelected = message.poll!.selectedOptionId === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={isVoting}
                      onClick={() => handleVote(option.id)}
                      className={cn(
                        "relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-wait",
                        isSelected
                          ? "border-indigo-400/70"
                          : "border-[#343B4C] hover:border-indigo-400/50"
                      )}
                      aria-pressed={isSelected}
                    >
                      <span
                        className="absolute inset-y-0 left-0 bg-indigo-500/15 transition-[width]"
                        style={{ width: `${percentage}%` }}
                      />
                      <span className="relative flex items-center justify-between gap-3 text-xs text-slate-100">
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              "size-3 rounded-full border",
                              isSelected
                                ? "border-indigo-300 bg-indigo-400"
                                : "border-slate-500"
                            )}
                          />
                          <span>{option.text}</span>
                        </span>
                        <span className="shrink-0 text-slate-300">
                          {percentage}% · {option.voteCount}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] text-slate-400">
                {message.poll.totalVotes} phiếu
                {message.poll.selectedOptionId
                  ? " · Bạn có thể chọn lại đáp án"
                  : " · Chọn một đáp án để bình chọn"}
              </p>
            </div>
          ) : isCodeSnippet ? (
            <div className="w-full rounded-2xl bg-[#12151E] border border-[#262B35] overflow-hidden text-xs shadow-md">
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#181B24] border-b border-[#262B35]">
                <span className="flex items-center gap-1.5 text-indigo-400 font-mono text-[11px]">
                  <Code2 className="size-3.5" /> Code Snippet
                </span>
                <button
                  onClick={() => handleCopyCode(cleanCodeContent)}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
                >
                  {copiedCode ? (
                    <>
                      <Check className="size-3 text-emerald-400" />
                      <span className="text-emerald-400">Đã sao chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 overflow-x-auto text-slate-200 font-mono leading-relaxed beautiful-scrollbar">
                <code>{cleanCodeContent}</code>
              </pre>
            </div>
          ) : isFileAttachment ? (
            /* File Attachment Preview Card */
            (() => {
              const file = getFileInfo(message.content);
              const FileIcon = file.Icon;
              return (
                <>
                  <div
                    className={cn(
                      "flex items-center justify-between gap-3 p-3 rounded-2xl border min-w-[240px] shadow-sm",
                      message.isOwn
                        ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-indigo-400/30"
                        : "bg-[#1E222D] text-slate-100 border-[#2B3245]"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          "size-10 rounded-xl flex items-center justify-center shrink-0",
                          message.isOwn ? "bg-white/20" : "bg-indigo-500/20 text-indigo-400"
                        )}
                      >
                        <FileIcon className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate max-w-[150px]">
                          {file.name}
                        </p>
                        {file.size && (
                          <p
                            className={cn(
                              "text-[10px]",
                              message.isOwn ? "text-white/80" : "text-slate-400"
                            )}
                          >
                            {file.size}
                          </p>
                        )}
                      </div>
                    </div>
                    {message.fileUrl ? (
                      <button
                        type="button"
                        onClick={() => handleDownload(file.name)}
                        className={cn(
                          "size-8 rounded-lg flex items-center justify-center transition-colors shrink-0",
                          message.isOwn
                            ? "hover:bg-white/20 text-white"
                            : "hover:bg-[#282F40] text-slate-300"
                        )}
                        title={`Tải về ${file.name}`}
                        aria-label={`Tải về ${file.name}`}
                      >
                        <Download className="size-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="size-8 rounded-lg flex items-center justify-center text-slate-500 shrink-0"
                        title="Tệp này chưa được lưu trên máy chủ"
                        aria-label="Không có liên kết tải tệp"
                      >
                        <Download className="size-4" />
                      </button>
                    )}
                  </div>
                  {message.fileUrl && message.content && (
                    <div
                      className={cn(
                        "px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words shadow-sm",
                        message.isOwn
                          ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-tr-xs"
                          : "bg-[#1E222D] text-slate-100 border border-[#2B3245] rounded-tl-xs"
                      )}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  )}
                </>
              );
            })()
          ) : (
            /* Standard Text Bubble */
            message.content && (
              <div
                className={cn(
                  "px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words shadow-sm",
                  message.isOwn
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-tr-xs shadow-indigo-500/10"
                    : "bg-[#1E222D] dark:bg-[#1E222D] text-slate-100 border border-[#2B3245] rounded-tl-xs"
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            )
          )}

          {/* Reactions badge */}
          {reactions.length > 0 && (
            <div className="flex items-center gap-1 -mt-1.5 px-2 py-0.5 rounded-full bg-[#181B24] border border-[#2B3245] shadow-sm text-xs">
              {reactions.map((r, i) => (
                <span key={i}>{r}</span>
              ))}
              <span className="text-[10px] text-slate-400 font-semibold ml-0.5">
                {reactions.length}
              </span>
            </div>
          )}

          {/* Time & Delivery/Seen Status Tick */}
          <div
            className={cn(
              "flex items-center gap-1 text-[10px] px-1 text-slate-400 select-none",
              message.isOwn ? "justify-end" : "justify-start"
            )}
          >
            <span>{formatMessageTime(msgDate)}</span>

            {/* Status ticks for own messages */}
            {message.isOwn && (
              <span className="inline-flex items-center ml-0.5">
                {isLastMessage && lastMessageStatus === "seen" ? (
                  <span
                    className="flex items-center gap-0.5 text-cyan-400 font-medium"
                    title="Đã xem"
                  >
                    <CheckCheck className="size-3.5 stroke-[2.5]" />
                    <span className="text-[9px]">Đã xem</span>
                  </span>
                ) : (
                  <span
                    className="flex items-center gap-0.5 text-slate-400"
                    title="Đã gửi"
                  >
                    <Check className="size-3.5" />
                    <span className="text-[9px]">Đã gửi</span>
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Image Lightbox Modal */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-3xl p-2 bg-[#12151E]/95 border-[#262B35] overflow-hidden flex flex-col items-center">
            <div className="w-full flex justify-between items-center px-2 py-1 border-b border-[#262B35] mb-2">
              <span className="text-xs text-slate-300 font-medium">Xem hình ảnh</span>
              <div className="flex items-center gap-2">
                <a
                  href={selectedImage}
                  download="hungo_image.jpg"
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg hover:bg-[#1F2430] text-slate-400 hover:text-white"
                  title="Tải về"
                >
                  <Download className="size-4" />
                </a>
              </div>
            </div>
            <img
              src={selectedImage}
              alt="Preview"
              className="max-h-[75vh] w-auto rounded-lg object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
export default MessageItem;
