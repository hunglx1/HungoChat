import { MessageSquare, Users, Cloud, ArrowRight } from "lucide-react";
import { useLayoutStore } from "@/stores/useLayoutStore";
import NewGroupChatModal from "./NewGroupChatModal";

export const ChatWelcomeScreen = () => {
  const { setActiveNavTab } = useLayoutStore();

  return (
    <div className="flex-1 h-full flex flex-col items-center justify-center bg-[#0F1117] dark:bg-[#0F1117] text-slate-100 p-6 select-none relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full text-center space-y-6 relative z-10">
        {/* Glowing Logo */}
        <div className="size-20 mx-auto rounded-3xl overflow-hidden shadow-xl shadow-indigo-500/25 ring-4 ring-indigo-500/15">
          <img src="/logo.svg" alt="Hungo" className="size-full object-cover" />
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 via-violet-300 to-white bg-clip-text text-transparent">
            Chào mừng bạn đến với Hungo
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
            Trải nghiệm nhắn tin thời gian thực hiện đại, mượt mà và bảo mật cao cấp.
          </p>
        </div>

        {/* Quick Action Feature Cards */}
        <div className="grid grid-cols-1 gap-3 pt-2">
          {/* Card 1: Contacts */}
          <button
            onClick={() => setActiveNavTab("contacts")}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-[#161922] hover:bg-[#1C202C] border border-[#222735] hover:border-indigo-500/40 text-left transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <MessageSquare className="size-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Bắt đầu trò chuyện</h4>
                <p className="text-[11px] text-slate-400">Chọn một bạn bè trong danh bạ để nhắn tin</p>
              </div>
            </div>
            <ArrowRight className="size-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
          </button>

          {/* Card 2: Create Group */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#161922] hover:bg-[#1C202C] border border-[#222735] hover:border-indigo-500/40 text-left transition-all group">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-violet-500/15 text-violet-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="size-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Tạo nhóm thảo luận</h4>
                <p className="text-[11px] text-slate-400">Kết nối nhiều bạn bè cùng trò chuyện</p>
              </div>
            </div>
            <NewGroupChatModal />
          </div>

          {/* Card 3: My Cloud */}
          <button
            onClick={() => setActiveNavTab("cloud")}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-[#161922] hover:bg-[#1C202C] border border-[#222735] hover:border-indigo-500/40 text-left transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Cloud className="size-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Cloud của tôi</h4>
                <p className="text-[11px] text-slate-400">Lưu nhanh ghi chú và tệp tài liệu cá nhân</p>
              </div>
            </div>
            <ArrowRight className="size-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
          </button>
        </div>
      </div>
    </div>
  );
};
export default ChatWelcomeScreen;
