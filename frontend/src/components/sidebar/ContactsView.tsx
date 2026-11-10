import { useState, useEffect } from "react";
import { Search, MessageCircle, Bell } from "lucide-react";
import { useFriendStore } from "@/stores/useFriendStore";
import { useChatStore } from "@/stores/useChatStore";
import { useSocketStore } from "@/stores/useSocketStore";
import { useLayoutStore } from "@/stores/useLayoutStore";
import UserAvatar from "@/components/chat/UserAvatar";
import StatusBadge from "@/components/chat/StatusBadge";
import FriendRequestDialog from "@/components/friendRequest/FriendRequestDialog";
import AddFriendModal from "@/components/chat/AddFriendModal";
import NewGroupChatModal from "@/components/chat/NewGroupChatModal";
import GroupChatAvatar from "@/components/chat/GroupChatAvatar";
import { Button } from "@/components/ui/button";

export const ContactsView = () => {
  const { friends, getFriends, receivedList } = useFriendStore();
  const { conversations, setActiveConversation, sendDirectMessage } = useChatStore();
  const { onlineUsers } = useSocketStore();
  const { setActiveNavTab } = useLayoutStore();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"friends" | "groups">("friends");
  const [friendRequestOpen, setFriendRequestOpen] = useState(false);

  useEffect(() => {
    getFriends().catch(() => {});
  }, [getFriends]);

  const filteredFriends = friends.filter((f) =>
    f.displayName.toLowerCase().includes(search.toLowerCase()) ||
    f.username.toLowerCase().includes(search.toLowerCase())
  );

  const groupConversations = conversations.filter((c) => c.type === "group");
  const filteredGroups = groupConversations.filter((g) =>
    g.group?.name.toLowerCase().includes(search.toLowerCase())
  );

  // Switch to or start direct chat with friend
  const handleStartChatWithFriend = async (friendId: string) => {
    // Check if direct conversation already exists
    const existing = conversations.find(
      (c) =>
        c.type === "direct" &&
        c.participants.some((p) => p._id === friendId)
    );

    if (existing) {
      setActiveConversation(existing._id);
    } else {
      // Start chat by selecting or sending initial message
      try {
        await sendDirectMessage(friendId, "Xin chào! 👋");
      } catch (err) {
        console.error(err);
      }
    }
    setActiveNavTab("chat");
  };

  const handleOpenGroup = (groupId: string) => {
    setActiveConversation(groupId);
    setActiveNavTab("chat");
  };

  return (
    <div className="flex flex-col h-full bg-[#161922] dark:bg-[#161922] select-none">
      {/* Top Search & Actions */}
      <div className="p-3 pb-2 space-y-2.5 border-b border-[#222735]">
        <div className="flex items-center justify-between gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm bạn bè, nhóm..."
              className="w-full h-9 pl-9 pr-3 text-xs bg-[#1F2430] border border-[#2B3245] text-slate-100 placeholder:text-slate-400 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50"
            />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <AddFriendModal />
            <NewGroupChatModal />
          </div>
        </div>

        {/* Tab buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("friends")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "friends"
                ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#1F2430]"
            }`}
          >
            Bạn bè ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "groups"
                ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#1F2430]"
            }`}
          >
            Nhóm ({groupConversations.length})
          </button>
        </div>
      </div>

      {/* Friend Request Bar */}
      <div className="p-2 border-b border-[#222735]">
        <button
          onClick={() => setFriendRequestOpen(true)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#1F2430]/60 hover:bg-[#1F2430] border border-[#2B3245]/60 text-slate-200 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Bell className="size-4" />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold">Lời mời kết bạn</p>
              <p className="text-[11px] text-slate-400">Xem và phản hồi lời mời</p>
            </div>
          </div>
          {receivedList.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-indigo-500 text-white text-[11px] font-bold">
              {receivedList.length}
            </span>
          )}
        </button>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto beautiful-scrollbar p-2 space-y-1">
        {activeTab === "friends" ? (
          filteredFriends.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              Không tìm thấy bạn bè nào
            </div>
          ) : (
            filteredFriends.map((friend) => {
              const isOnline = onlineUsers.includes(friend._id);
              return (
                <div
                  key={friend._id}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#1E2330] transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <UserAvatar
                        type="chat"
                        name={friend.displayName}
                        avatarUrl={friend.avatarUrl || undefined}
                        className="size-10"
                      />
                      <StatusBadge status={isOnline ? "online" : "offline"} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">
                        {friend.displayName}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {isOnline ? "Đang hoạt động" : "Ngoại tuyến"}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleStartChatWithFriend(friend._id)}
                    className="size-8 p-0 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg shrink-0"
                    title="Nhắn tin"
                  >
                    <MessageCircle className="size-4" />
                  </Button>
                </div>
              );
            })
          )
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            Bạn chưa tham gia nhóm nào
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div
              key={group._id}
              onClick={() => handleOpenGroup(group._id)}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#1E2330] cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <GroupChatAvatar
                  participants={group.participants}
                  type="chat"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {group.group?.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {group.participants.length} thành viên
                  </p>
                </div>
              </div>
              <MessageCircle className="size-4 text-slate-400 group-hover:text-indigo-400 shrink-0" />
            </div>
          ))
        )}
      </div>

      <FriendRequestDialog
        open={friendRequestOpen}
        setOpen={setFriendRequestOpen}
      />
    </div>
  );
};
export default ContactsView;
