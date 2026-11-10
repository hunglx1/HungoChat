import { useState, useEffect } from "react";
import {
  MessageSquare,
  Users,
  Cloud,
  Settings,
  Sun,
  Moon,
  User as UserIcon,
  Bell,
} from "lucide-react";
import { useLayoutStore, type NavTab } from "@/stores/useLayoutStore";
import { useChatStore } from "@/stores/useChatStore";
import { useFriendStore } from "@/stores/useFriendStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ProfileDialog from "@/components/profile/ProfileDialog";
import FriendRequestDialog from "@/components/friendRequest/FriendRequestDialog";
import Logout from "@/components/auth/Logout";
import { SettingsDialog } from "./SettingsDialog";
import { cn } from "@/lib/utils";

export const NavigationRail = () => {
  const { activeNavTab, setActiveNavTab, isSettingsOpen, setIsSettingsOpen } =
    useLayoutStore();
  const { conversations } = useChatStore();
  const { receivedList, getAllFriendRequests } = useFriendStore();
  const { user } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();

  const [profileOpen, setProfileOpen] = useState(false);
  const [friendRequestOpen, setFriendRequestOpen] = useState(false);

  useEffect(() => {
    getAllFriendRequests().catch(() => {});
  }, [getAllFriendRequests]);

  // Calculate total unread messages
  const totalUnread = conversations.reduce((total, convo) => {
    if (!user?._id || !convo.unreadCounts) return total;
    return total + (convo.unreadCounts[user._id] || 0);
  }, 0);

  const pendingRequestsCount = receivedList?.length || 0;

  const navItems: {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    {
      id: "chat",
      label: "Tin nhắn",
      icon: MessageSquare,
      badge: totalUnread,
    },
    {
      id: "contacts",
      label: "Danh bạ & Bạn bè",
      icon: Users,
      badge: pendingRequestsCount,
    },
    {
      id: "cloud",
      label: "Cloud của tôi",
      icon: Cloud,
    },
  ];

  return (
    <TooltipProvider delayDuration={150}>
      <aside className="w-16 shrink-0 h-screen bg-[#11141D] dark:bg-[#11141D] border-r border-[#1E2330] flex flex-col items-center py-3 select-none z-20">
        {/* Brand App Logo */}
        <div className="mb-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setActiveNavTab("chat")}
                className="size-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 transition-transform hover:scale-105 active:scale-95 overflow-hidden"
              >
                <img src="/logo.svg" alt="Hungo" className="size-full object-cover" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-[#1F2430] text-slate-100 border-[#2B3245]">
              Hungo
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Main Navigation Items */}
        <nav className="flex-1 flex flex-col items-center gap-2 w-full px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNavTab === item.id;

            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveNavTab(item.id)}
                    className={cn(
                      "relative size-12 rounded-xl flex items-center justify-center transition-all duration-200 group cursor-pointer",
                      isActive
                        ? "bg-gradient-to-tr from-indigo-500/20 to-violet-500/20 text-indigo-400 font-semibold shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-[#181D28]"
                    )}
                  >
                    {/* Active Left Indicator Bar */}
                    {isActive && (
                      <span className="absolute -left-2 top-2 bottom-2 w-1 rounded-r-full bg-gradient-to-b from-indigo-500 to-violet-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                    )}

                    <Icon
                      className={cn(
                        "size-5 transition-transform group-hover:scale-110",
                        isActive && "stroke-[2.2px] text-indigo-400"
                      )}
                    />

                    {/* Unread Badge Counter */}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-[10px] font-bold text-white flex items-center justify-center shadow-md animate-in zoom-in-50">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-[#1F2430] text-slate-100 border-[#2B3245]">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Bottom Rail Actions */}
        <div className="flex flex-col items-center gap-3 w-full px-2 pt-2 border-t border-[#1E2330]">
          {/* Theme Toggle Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleTheme}
                className="size-10 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-[#181D28] flex items-center justify-center transition-all cursor-pointer"
              >
                {isDark ? (
                  <Sun className="size-5 text-amber-400/90 hover:rotate-45 transition-transform" />
                ) : (
                  <Moon className="size-5 text-indigo-400 hover:-rotate-12 transition-transform" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-[#1F2430] text-slate-100 border-[#2B3245]">
              {isDark ? "Chuyển giao diện sáng" : "Chuyển giao diện tối"}
            </TooltipContent>
          </Tooltip>

          {/* Settings Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="size-10 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-[#181D28] flex items-center justify-center transition-all cursor-pointer"
              >
                <Settings className="size-5 hover:rotate-90 transition-transform duration-300" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-[#1F2430] text-slate-100 border-[#2B3245]">
              Cài đặt ứng dụng
            </TooltipContent>
          </Tooltip>

          {/* User Profile Avatar with Menu */}
          {user && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button className="relative size-10 rounded-full ring-2 ring-transparent hover:ring-indigo-500/50 transition-all cursor-pointer outline-none mt-1">
                      <Avatar className="size-10 rounded-full border border-indigo-500/30">
                        <AvatarImage src={user.avatarUrl} alt={user.displayName} />
                        <AvatarFallback className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white font-medium text-sm">
                          {user.displayName?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      {/* Online Status Dot */}
                      <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 ring-2 ring-[#11141D]" />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-[#1F2430] text-slate-100 border-[#2B3245]">
                  {user.displayName}
                </TooltipContent>
              </Tooltip>

              <DropdownMenuContent
                side="right"
                align="end"
                className="w-56 bg-[#181B24] border-[#262B35] text-slate-100 p-1.5 shadow-xl rounded-xl z-50"
              >
                <DropdownMenuLabel className="p-2 font-normal">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9 rounded-full border border-indigo-500/30">
                      <AvatarImage src={user.avatarUrl} alt={user.displayName} />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white font-medium text-xs">
                        {user.displayName?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-xs leading-tight">
                      <span className="truncate font-semibold text-sm text-white">
                        {user.displayName}
                      </span>
                      <span className="truncate text-slate-400">@{user.username}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="bg-[#262B35]" />

                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => setProfileOpen(true)}
                    className="hover:bg-[#1F2430] focus:bg-[#1F2430] text-slate-200 cursor-pointer rounded-lg text-xs py-2 gap-2"
                  >
                    <UserIcon className="size-4 text-indigo-400" />
                    Hồ sơ cá nhân
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFriendRequestOpen(true)}
                    className="hover:bg-[#1F2430] focus:bg-[#1F2430] text-slate-200 cursor-pointer rounded-lg text-xs py-2 gap-2 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-2">
                      <Bell className="size-4 text-indigo-400" />
                      Lời mời kết bạn
                    </div>
                    {pendingRequestsCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-indigo-500 text-[10px] text-white font-semibold">
                        {pendingRequestsCount}
                      </span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsSettingsOpen(true)}
                    className="hover:bg-[#1F2430] focus:bg-[#1F2430] text-slate-200 cursor-pointer rounded-lg text-xs py-2 gap-2"
                  >
                    <Settings className="size-4 text-indigo-400" />
                    Cài đặt
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator className="bg-[#262B35]" />

                <DropdownMenuItem
                  className="hover:bg-red-500/10 focus:bg-red-500/10 text-red-400 cursor-pointer rounded-lg text-xs py-2 gap-2"
                >
                  <Logout />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Profile Dialog */}
        <ProfileDialog open={profileOpen} setOpen={setProfileOpen} />

        {/* Friend Request Dialog */}
        <FriendRequestDialog
          open={friendRequestOpen}
          setOpen={setFriendRequestOpen}
        />

        {/* Settings Dialog */}
        <SettingsDialog
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
        />
      </aside>
    </TooltipProvider>
  );
};
