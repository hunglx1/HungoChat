import { useFriendStore } from "@/stores/useFriendStore";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { UserPlus, Users } from "lucide-react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import type { Friend } from "@/types/user";
import IniviteSuggestionList from "../newGroupChat/IniviteSuggestionList";
import SelectedUsersList from "../newGroupChat/SelectedUsersList";
import { toast } from "sonner";
import { useChatStore } from "@/stores/useChatStore";

const NewGroupChatModal = () => {
  const [groupName, setGroupName] = useState("");
  const [search, setSearch] = useState("");
  const { friends, getFriends, loading: friendsLoading } = useFriendStore();
  const [invitedUsers, setInvitedUsers] = useState<Friend[]>([]);
  const { loading: creatingGroup, createConversation } = useChatStore();

  const handleGetFriends = async () => {
    await getFriends();
  };

  const handleSelectFriend = (friend: Friend) => {
    setInvitedUsers([...invitedUsers, friend]);
    setSearch("");
  };

  const handleRemoveFriend = (friend: Friend) => {
    setInvitedUsers(invitedUsers.filter((u) => u._id !== friend._id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    try {
      e.preventDefault();
      if (invitedUsers.length === 0) {
        toast.warning("Bạn phải mời ít nhất 1 thành viên vào nhóm");
        return;
      }

      await createConversation(
        "group",
        groupName,
        invitedUsers.map((u) => u._id)
      );

      setSearch("");
      setInvitedUsers([]);
    } catch (error) {
      console.error("Lỗi xảy ra khi handleSubmit trong NewGroupChatModal:", error);
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filteredFriends = friends.filter((friend) => {
    const matchesSearch =
      friend.displayName.toLowerCase().includes(normalizedSearch) ||
      friend.username.toLowerCase().includes(normalizedSearch);
    return (
      matchesSearch &&
      !invitedUsers.some((invitedUser) => invitedUser._id === friend._id)
    );
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          onClick={handleGetFriends}
          className="flex z-10 justify-center items-center size-5 rounded-full hover:bg-sidebar-accent transition cursor-pointer"
        >
          <Users className="size-4" />
          <span className="sr-only">Tạo nhóm</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px] border-none">
        <DialogHeader>
          <DialogTitle className="capitalize">tạo nhóm chat mới</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={handleSubmit}
        >
          {/* tên nhóm */}
          <div className="space-y-2">
            <Label
              htmlFor="groupName"
              className="text-sm font-semibold"
            >
              Tên nhóm
            </Label>
            <Input
              id="groupName"
              placeholder="Gõ tên nhóm vào đây..."
              className="glass border-border/50 focus:border-primary/50 transition-smooth"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
            />
          </div>

          {/* mời thành viên */}
          <div className="space-y-2">
            <Label
              htmlFor="invite"
              className="text-sm font-semibold"
            >
              Mời thành viên
            </Label>

            <Input
              id="invite"
              placeholder="Tìm theo tên hiển thị..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />

            {/* Danh sách bạn bè luôn hiển thị; ô tìm kiếm chỉ dùng để lọc. */}
            {friendsLoading ? (
              <p className="py-3 text-center text-sm text-muted-foreground">
                Đang tải danh sách bạn bè...
              </p>
            ) : (
              <IniviteSuggestionList
                filteredFriends={filteredFriends}
                onSelect={handleSelectFriend}
                emptyMessage={
                  normalizedSearch
                    ? "Không tìm thấy bạn bè phù hợp."
                    : friends.length === 0
                      ? "Bạn chưa có bạn bè để mời."
                      : "Đã chọn tất cả bạn bè."
                }
              />
            )}

            {/* danh sách user đã chọn */}
            <SelectedUsersList
              invitedUsers={invitedUsers}
              onRemove={handleRemoveFriend}
            />
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={creatingGroup}
              className="flex-1 bg-gradient-chat text-white hover:opacity-90 transition-smooth"
            >
              {creatingGroup ? (
                <span>Đang tạo...</span>
              ) : (
                <>
                  <UserPlus className="size-4 mr-2" />
                  Tạo nhóm
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewGroupChatModal;
