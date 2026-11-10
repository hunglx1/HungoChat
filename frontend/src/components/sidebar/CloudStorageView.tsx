import { useState, useEffect } from "react";
import { Cloud, FileText, Send, CheckCircle2, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface SavedNote {
  id: string;
  text: string;
  date: string;
}

export const CloudStorageView = () => {
  const [note, setNote] = useState("");
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>(() => {
    try {
      const stored = localStorage.getItem("hungo_cloud_notes");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("hungo_cloud_notes", JSON.stringify(savedNotes));
    } catch (e) {
      console.error(e);
    }
  }, [savedNotes]);

  const handleSaveNote = () => {
    if (!note.trim()) return;
    const newNote: SavedNote = {
      id: Date.now().toString(),
      text: note.trim(),
      date: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      }),
    };
    setSavedNotes([newNote, ...savedNotes]);
    setNote("");
    toast.success("Đã lưu ghi chú vào Cloud của bạn");
  };

  const handleDeleteNote = (id: string) => {
    setSavedNotes(savedNotes.filter((n) => n.id !== id));
    toast.info("Đã xóa ghi chú");
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Đã sao chép vào bộ nhớ tạm");
  };

  return (
    <div className="flex flex-col h-full bg-[#161922] dark:bg-[#161922] select-none p-3 space-y-3">
      {/* Cloud Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-900/40 via-violet-900/30 to-[#1F2430] border border-indigo-500/20 text-slate-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="size-10 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md">
            <Cloud className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Cloud của tôi</h3>
            <p className="text-[11px] text-slate-300">Không gian lưu trữ cá nhân & ghi chú</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-300 pt-2 border-t border-indigo-500/10">
          <span>Ghi chú đã lưu: {savedNotes.length}</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="size-3.5" /> Đồng bộ tức thì
          </span>
        </div>
      </div>

      {/* Quick Note Input */}
      <div className="p-3 rounded-xl bg-[#1F2430] border border-[#2B3245] space-y-2">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <FileText className="size-3.5 text-indigo-400" />
          Lưu nhanh ghi chú / liên kết
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveNote()}
            placeholder="Nhập nội dung cần lưu..."
            className="flex-1 text-xs bg-[#181B24] border border-[#2B3245] rounded-lg px-3 py-1.5 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleSaveNote}
            disabled={!note.trim()}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-medium disabled:opacity-40 hover:shadow-md transition-all flex items-center gap-1 cursor-pointer"
          >
            <Send className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Saved Notes List */}
      <div className="flex-1 overflow-y-auto beautiful-scrollbar space-y-2">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
          Ghi chú của bạn ({savedNotes.length})
        </p>

        {savedNotes.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Chưa có ghi chú nào được lưu trong Cloud.
          </div>
        ) : (
          savedNotes.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-[#1F2430]/60 hover:bg-[#1F2430] border border-[#2B3245]/60 transition-all group relative"
            >
              <p className="text-xs text-slate-200 leading-relaxed break-words pr-6">
                {item.text}
              </p>
              <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#262B35] text-[10px] text-slate-400">
                <span>{item.date}</span>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => handleCopy(item.text)}
                    className="hover:text-indigo-400 flex items-center gap-1"
                    title="Sao chép"
                  >
                    <Copy className="size-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteNote(item.id)}
                    className="hover:text-red-400 flex items-center gap-1"
                    title="Xóa ghi chú"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default CloudStorageView;
