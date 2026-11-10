import { create } from "zustand";

export type NavTab = "chat" | "contacts" | "cloud";
export type ChatFilter = "all" | "unread" | "groups";

interface LayoutState {
  activeNavTab: NavTab;
  setActiveNavTab: (tab: NavTab) => void;
  isInfoSidebarOpen: boolean;
  setIsInfoSidebarOpen: (open: boolean) => void;
  toggleInfoSidebar: () => void;
  chatFilter: ChatFilter;
  setChatFilter: (filter: ChatFilter) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isSearchInChatOpen: boolean;
  setIsSearchInChatOpen: (open: boolean) => void;
  searchInChatQuery: string;
  setSearchInChatQuery: (query: string) => void;
  pinnedMessage: string | null;
  setPinnedMessage: (msg: string | null) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  activeNavTab: "chat",
  setActiveNavTab: (tab) => set({ activeNavTab: tab }),
  isInfoSidebarOpen: false,
  setIsInfoSidebarOpen: (open) => set({ isInfoSidebarOpen: open }),
  toggleInfoSidebar: () =>
    set((state) => ({ isInfoSidebarOpen: !state.isInfoSidebarOpen })),
  chatFilter: "all",
  setChatFilter: (filter) => set({ chatFilter: filter }),
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),
  isSettingsOpen: false,
  setIsSettingsOpen: (open) => set({ isSettingsOpen: open }),
  isSearchInChatOpen: false,
  setIsSearchInChatOpen: (open) => set({ isSearchInChatOpen: open }),
  searchInChatQuery: "",
  setSearchInChatQuery: (query) => set({ searchInChatQuery: query }),
  pinnedMessage: null,
  setPinnedMessage: (msg) => set({ pinnedMessage: msg }),
}));
