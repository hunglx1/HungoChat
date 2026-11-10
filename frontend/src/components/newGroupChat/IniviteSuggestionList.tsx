import type { Friend } from "@/types/user";
import UserAvatar from "../chat/UserAvatar";

interface InviteSuggestionListProps {
  filteredFriends: Friend[];
  onSelect: (friend: Friend) => void;
  emptyMessage: string;
}

const IniviteSuggestionList = ({
  filteredFriends,
  onSelect,
  emptyMessage,
}: InviteSuggestionListProps) => {
  if (filteredFriends.length === 0) {
    return (
      <p className="py-3 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="mt-2 max-h-[220px] overflow-y-auto divide-y rounded-lg border">
      {filteredFriends.map((friend) => (
        <button
          key={friend._id}
          type="button"
          className="flex w-full items-center gap-3 p-2 text-left transition hover:bg-muted"
          onClick={() => onSelect(friend)}
        >
          <UserAvatar
            type="chat"
            name={friend.displayName}
            avatarUrl={friend.avatarUrl}
          />

          <span className="font-medium">{friend.displayName}</span>
          <span className="ml-auto text-sm text-muted-foreground">
            @{friend.username}
          </span>
        </button>
      ))}
    </div>
  );
};

export default IniviteSuggestionList;
