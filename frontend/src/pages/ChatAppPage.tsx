import { useEffect } from "react";
import { NavigationRail } from "@/components/sidebar/NavigationRail";
import { ConversationSidebar } from "@/components/sidebar/ConversationSidebar";
import { ContactsView } from "@/components/sidebar/ContactsView";
import { CloudStorageView } from "@/components/sidebar/CloudStorageView";
import ChatWindowLayout from "@/components/chat/ChatWindowLayout";
import ChatInfoSidebar from "@/components/chat/ChatInfoSidebar";
import VideoCallDialog from "@/components/chat/VideoCallDialog";
import { useLayoutStore } from "@/stores/useLayoutStore";
import { useChatStore } from "@/stores/useChatStore";
import { cn } from "@/lib/utils";

const ChatAppPage = () => {
  const { activeNavTab, isInfoSidebarOpen, toggleInfoSidebar } =
    useLayoutStore();
  const { activeConversationId, conversations, fetchConversations } =
    useChatStore();

  useEffect(() => {
    fetchConversations().catch(() => {});
  }, [fetchConversations]);

  const selectedConvo = conversations.find(
    (c) => c._id === activeConversationId
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0F1117] dark:bg-[#0F1117] text-slate-100 select-none">
      {/* 1. Far-Left Navigation Rail (64px) */}
      <NavigationRail />

      {/* 2. Left Sidebar (Chat List & Search, Contacts, or Cloud) */}
      <aside
        className={cn(
          "w-full md:w-80 lg:w-88 h-full flex flex-col shrink-0 border-r border-[#222735] bg-[#161922] dark:bg-[#161922] z-10",
          activeConversationId ? "hidden md:flex" : "flex"
        )}
      >
        {activeNavTab === "chat" && <ConversationSidebar />}
        {activeNavTab === "contacts" && <ContactsView />}
        {activeNavTab === "cloud" && <CloudStorageView />}
      </aside>

      {/* 3. Right Main Chat Area */}
      <main
        className={cn(
          "flex-1 h-full flex flex-col overflow-hidden bg-[#0F1117] dark:bg-[#0F1117]",
          !activeConversationId ? "hidden md:flex" : "flex"
        )}
      >
        <ChatWindowLayout />
      </main>

      {/* 4. Far-Right Context / Info Sidebar (Collapsible, 320px) */}
      {isInfoSidebarOpen && selectedConvo && (
        <aside className="w-80 lg:w-[340px] h-full flex flex-col shrink-0 bg-[#181B24] dark:bg-[#181B24] border-l border-[#262B35] animate-in slide-in-from-right-10 duration-200 z-10">
          <ChatInfoSidebar
            chat={selectedConvo}
            onClose={toggleInfoSidebar}
          />
        </aside>
      )}

      {/* Video Call Dialog */}
      <VideoCallDialog />
    </div>
  );
};

export default ChatAppPage;
