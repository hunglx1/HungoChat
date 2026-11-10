export interface Participant {
  _id: string;
  displayName: string;
  avatarUrl?: string | null;
  joinedAt: string;
}

export interface SeenUser {
  _id: string;
  displayName?: string;
  avatarUrl?: string | null;
}

export interface Group {
  name: string;
  createdBy: string;
}

export interface LastMessage {
  _id: string;
  content: string | null;
  fileName?: string | null;
  messageType?: string;
  poll?: Pick<Poll, "question"> | null;
  imgUrl?: string | null;
  createdAt: string;
  sender: {
    _id: string;
    displayName: string;
    avatarUrl?: string | null;
  };
}

export interface Conversation {
  _id: string;
  type: "direct" | "group";
  group: Group;
  participants: Participant[];
  lastMessageAt: string;
  seenBy: SeenUser[];
  lastMessage: LastMessage | null;
  unreadCounts: Record<string, number>; // key = userId, value = unread count
  createdAt: string;
  updatedAt: string;
}

export interface ConversationResponse {
  conversations: Conversation[];
}

export interface Poll {
  id: string;
  question: string;
  options: Array<{
    id: string;
    text: string;
    voteCount: number;
  }>;
  totalVotes: number;
  selectedOptionId?: string | null;
}

export interface Message {
  _id: string;
  clientMessageId?: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  imgUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  messageType?: string;
  poll?: Poll | null;
  updatedAt?: string | null;
  createdAt: string;
  isOwn?: boolean;
}
