import { useState, useRef } from "react";
import {
  Paperclip,
  ImagePlus,
  Mic,
  BarChart2,
  SendHorizontal,
  X,
  File,
} from "lucide-react";
import type { Conversation } from "@/types/chat";
import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";
import EmojiPicker from "./EmojiPicker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn, formatFileSize } from "@/lib/utils";
import axios from "axios";

interface MessageInputProps {
  selectedConvo: Conversation;
}

export const MessageInput = ({ selectedConvo }: MessageInputProps) => {
  const { user } = useAuthStore();
  const { sendDirectMessage, sendGroupMessage, createPoll } = useChatStore();

  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordTimer, setRecordTimer] = useState(0);
  const [selectedFile, setSelectedFile] = useState<{
    file: File;
    previewUrl?: string;
    isImage: boolean;
  } | null>(null);

  // Poll Dialog State
  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recordIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  if (!user) return null;

  // Handle Send
  const handleSendMessage = async () => {
    if (!text.trim() && !selectedFile) return;

    const messageContent = text.trim();
    const fileToRestore = selectedFile;
    const fileToSend = fileToRestore?.file;

    // Reset input state immediately
    setText("");
    setSelectedFile(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      if (selectedConvo.type === "direct") {
        const otherUser = selectedConvo.participants.find((p) => p._id !== user._id);
        if (!otherUser) return;
        await sendDirectMessage(otherUser._id, messageContent, undefined, fileToSend);
      } else {
        await sendGroupMessage(selectedConvo._id, messageContent, undefined, fileToSend);
      }
    } catch (error) {
      console.error("Lỗi khi gửi tin nhắn", error);
      setText(messageContent);
      if (fileToRestore) {
        setSelectedFile((current) => current ?? fileToRestore);
      }
      const errorMessage = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : null;
      toast.error(errorMessage || "Không thể gửi tin nhắn. Vui lòng thử lại!");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Image & File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isImage: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Tệp đính kèm không được vượt quá 10 MB");
      e.target.value = "";
      return;
    }

    if (isImage) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedFile({
          file,
          previewUrl: event.target?.result as string,
          isImage: true,
        });
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile({
        file,
        isImage: false,
      });
    }
    e.target.value = "";
  };

  // Voice note simulation
  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording and send audio message
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      setIsRecording(false);
      setText(`🎙️ [Tin nhắn thoại: 00:${recordTimer < 10 ? `0${recordTimer}` : recordTimer}]`);
      setRecordTimer(0);
      toast.success("Đã ghi lại tin nhắn thoại");
    } else {
      setIsRecording(true);
      setRecordTimer(1);
      recordIntervalRef.current = setInterval(() => {
        setRecordTimer((prev) => prev + 1);
      }, 1000);
    }
  };

  const cancelRecording = () => {
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    setIsRecording(false);
    setRecordTimer(0);
  };

  // Create poll
  const handleCreatePoll = async () => {
    if (selectedConvo.type !== "group") return;
    if (!pollQuestion.trim()) {
      toast.warning("Vui lòng nhập câu hỏi bình chọn");
      return;
    }
    const options = pollOptions.map((option) => option.trim()).filter(Boolean);
    if (options.length < 2) {
      toast.warning("Bình chọn cần ít nhất 2 lựa chọn");
      return;
    }
    if (options.length > 10) {
      toast.warning("Bình chọn không được vượt quá 10 lựa chọn");
      return;
    }
    if (new Set(options.map((option) => option.toLocaleLowerCase())).size !== options.length) {
      toast.warning("Các lựa chọn không được trùng nhau");
      return;
    }

    try {
      await createPoll(selectedConvo._id, pollQuestion.trim(), options);
      setPollDialogOpen(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
      toast.success("Đã tạo bình chọn");
    } catch (error) {
      console.error("Không thể tạo bình chọn", error);
      const errorMessage = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : null;
      toast.error(errorMessage || "Không thể tạo bình chọn");
    }
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="bg-[#161922] dark:bg-[#161922] border-t border-[#222735] px-4 py-2.5 space-y-2 select-none shrink-0 z-10">
        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFileChange(e, false)}
          className="hidden"
        />
        <input
          type="file"
          accept="image/*"
          ref={imageInputRef}
          onChange={(e) => handleFileChange(e, true)}
          className="hidden"
        />

        {/* Attachment Preview Tray */}
        {selectedFile && (
          <div className="flex items-center gap-2 p-2 rounded-xl bg-[#1F2430] border border-[#2B3245] animate-in fade-in-50">
            {selectedFile.isImage ? (
              <div className="relative size-14 rounded-lg overflow-hidden border border-[#2B3245]">
                <img
                  src={selectedFile.previewUrl}
                  alt="Preview"
                  className="size-full object-cover"
                />
              </div>
            ) : (
              <div className="size-10 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <File className="size-5" />
              </div>
            )}

            <div className="flex-1 min-w-0 text-xs">
              <p className="font-semibold text-slate-200 truncate">
                {selectedFile.file.name}
              </p>
              <p className="text-[11px] text-slate-400">
                {formatFileSize(selectedFile.file.size)}
              </p>
            </div>

            <button
              onClick={() => setSelectedFile(null)}
              className="size-7 rounded-lg hover:bg-[#282F40] text-slate-400 hover:text-white flex items-center justify-center"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Voice Recording Active Bar */}
        {isRecording && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 animate-pulse">
            <div className="flex items-center gap-2 text-xs text-red-400 font-semibold">
              <span className="size-2.5 rounded-full bg-red-500 animate-ping" />
              Đang ghi âm tin nhắn thoại: 00:{recordTimer < 10 ? `0${recordTimer}` : recordTimer}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={cancelRecording}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10"
              >
                Hủy
              </button>
              <button
                onClick={toggleRecording}
                className="text-xs bg-red-500 hover:bg-red-600 text-white font-semibold px-3 py-1 rounded-lg"
              >
                Gửi
              </button>
            </div>
          </div>
        )}

        {/* Rich Toolbar Row */}
        <div className="flex items-center justify-between gap-1 text-slate-400">
          <div className="flex items-center gap-0.5">
            {/* Attach File */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="size-8 rounded-lg flex items-center justify-center hover:text-slate-200 hover:bg-[#1F2430] transition-colors"
                >
                  <Paperclip className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-[#1F2430] text-slate-100 border-[#2B3245]">
                Đính kèm tệp tin
              </TooltipContent>
            </Tooltip>

            {/* Send Image/Video */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="size-8 rounded-lg flex items-center justify-center hover:text-slate-200 hover:bg-[#1F2430] transition-colors"
                >
                  <ImagePlus className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-[#1F2430] text-slate-100 border-[#2B3245]">
                Gửi hình ảnh
              </TooltipContent>
            </Tooltip>

            {/* Emoji Picker Popover */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="size-8 rounded-lg flex items-center justify-center hover:text-slate-200 hover:bg-[#1F2430] transition-colors">
                  <EmojiPicker
                    onChange={(emoji: string) => setText((prev) => `${prev}${emoji}`)}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-[#1F2430] text-slate-100 border-[#2B3245]">
                Biểu cảm & Nhãn dán
              </TooltipContent>
            </Tooltip>

            {/* Voice Note */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleRecording}
                  className={cn(
                    "size-8 rounded-lg flex items-center justify-center transition-colors",
                    isRecording
                      ? "text-red-400 bg-red-500/20"
                      : "hover:text-slate-200 hover:bg-[#1F2430]"
                  )}
                >
                  <Mic className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-[#1F2430] text-slate-100 border-[#2B3245]">
                Tin nhắn thoại
              </TooltipContent>
            </Tooltip>

            {selectedConvo.type === "group" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setPollDialogOpen(true)}
                    className="size-8 rounded-lg flex items-center justify-center hover:text-slate-200 hover:bg-[#1F2430] transition-colors hidden sm:flex"
                  >
                    <BarChart2 className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-[#1F2430] text-slate-100 border-[#2B3245]">
                  Tạo cuộc bình chọn
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Nhấn <kbd className="px-1 py-0.5 rounded bg-[#1F2430] border border-[#2B3245] text-slate-300">Enter</kbd> để gửi
          </span>
        </div>

        {/* Input Text Field Row */}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative rounded-xl bg-[#1F2430] border border-[#2B3245] focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn @tên, /tính_năng..."
              className="w-full max-h-32 p-2.5 text-xs text-slate-100 placeholder:text-slate-400 bg-transparent resize-none focus:outline-none beautiful-scrollbar"
            />
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSendMessage}
            disabled={!text.trim() && !selectedFile}
            className="size-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 hover:shadow-lg hover:shadow-indigo-500/30 text-white transition-all disabled:opacity-40 disabled:hover:scale-100 hover:scale-105 active:scale-95 shrink-0"
            title="Gửi tin nhắn"
          >
            <SendHorizontal className="size-5" />
          </Button>
        </div>

        {selectedConvo.type === "group" && (
        <Dialog open={pollDialogOpen} onOpenChange={setPollDialogOpen}>
          <DialogContent className="sm:max-w-[420px] bg-[#181B24] border-[#262B35] text-slate-100">
            <DialogHeader>
              <DialogTitle className="text-white text-base">Tạo cuộc bình chọn mới</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Câu hỏi bình chọn</Label>
                <Input
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="Nhập câu hỏi bình chọn..."
                  maxLength={500}
                  className="bg-[#1F2430] border-[#2B3245] text-xs text-slate-100"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Các lựa chọn</Label>
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const updated = [...pollOptions];
                        updated[i] = e.target.value;
                        setPollOptions(updated);
                      }}
                      placeholder={`Lựa chọn ${i + 1}`}
                      maxLength={160}
                      className="bg-[#1F2430] border-[#2B3245] text-xs text-slate-100"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          setPollOptions(pollOptions.filter((_, index) => index !== i))
                        }
                        className="text-slate-400 hover:text-red-400"
                        aria-label={`Xóa lựa chọn ${i + 1}`}
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 10 && (
                  <button
                    type="button"
                    onClick={() => setPollOptions([...pollOptions, ""])}
                    className="text-xs text-indigo-400 hover:underline pt-1"
                  >
                    + Thêm lựa chọn
                  </button>
                )}
                <p className="text-[11px] text-slate-400">
                  Mỗi người chọn một đáp án. Có thể đổi lựa chọn sau khi bình chọn.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPollDialogOpen(false)}
                className="bg-transparent border-[#2B3245] text-slate-300"
              >
                Hủy
              </Button>
              <Button
                size="sm"
                onClick={handleCreatePoll}
                disabled={!pollQuestion.trim() || pollOptions.filter((option) => option.trim()).length < 2}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
              >
                Tạo bình chọn
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </div>
    </TooltipProvider>
  );
};
export default MessageInput;
