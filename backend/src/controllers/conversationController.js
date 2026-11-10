import prisma from "../libs/prisma.js";
import { io } from "../socket/index.js";

const conversationInclude = {
  participants: {
    include: {
      user: {
        select: { id: true, displayName: true, avatarUrl: true },
      },
    },
  },
  lastMessage: {
    include: {
      poll: { select: { question: true } },
      sender: {
        select: { id: true, displayName: true, avatarUrl: true },
      },
    },
  },
};

const formatConversation = (conversation) => {
  const last = conversation.lastMessage;
  const participants = conversation.participants ?? [];
  const seenBy = last
    ? participants
        .filter(
          (participant) =>
            participant.userId !== last.senderId &&
            participant.lastSeenAt &&
            participant.lastSeenAt >= last.createdAt
        )
        .map(({ user }) => ({
          _id: user.id,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        }))
    : [];

  return {
    _id: conversation.id,
    type: conversation.type,
    isGroup: conversation.type === "group",
    name: conversation.name,
    group:
      conversation.type === "group"
        ? { name: conversation.name, createdBy: conversation.createdById }
        : undefined,
    participants: participants.map(({ user, joinedAt }) => ({
      _id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      joinedAt,
    })),
    lastMessageAt: conversation.lastMessageAt,
    seenBy,
    lastMessage: last
      ? {
          _id: last.id,
          content: last.content,
          imgUrl: last.imgUrl,
          fileName: last.fileName,
          messageType: last.messageType,
          poll: last.poll ? { question: last.poll.question } : null,
          createdAt: last.createdAt,
          senderId: last.senderId,
          sender: {
            _id: last.sender.id,
            displayName: last.sender.displayName,
            avatarUrl: last.sender.avatarUrl,
          },
        }
      : null,
    unreadCounts: Object.fromEntries(
      participants.map(({ userId, unreadCount }) => [userId, unreadCount])
    ),
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
};

const formatPoll = (poll) => {
  if (!poll) return null;
  const options = poll.options.map((option) => ({
    id: option.id,
    text: option.text,
    voteCount: option._count.votes,
  }));
  return {
    id: poll.id,
    question: poll.question,
    options,
    totalVotes: options.reduce((total, option) => total + option.voteCount, 0),
    selectedOptionId: poll.votes[0]?.optionId ?? null,
  };
};

export const createConversation = async (req, res) => {
  try {
    const { type, name, memberIds } = req.body;
    const userId = req.user._id;

    if (
      !["direct", "group"].includes(type) ||
      (type === "group" && !name?.trim()) ||
      !Array.isArray(memberIds) ||
      memberIds.length === 0 ||
      memberIds.some((id) => typeof id !== "string" || !id)
    ) {
      return res
        .status(400)
        .json({ message: "Tên nhóm và danh sách thành viên là bắt buộc" });
    }

    const uniqueMemberIds = [...new Set(memberIds)].filter((id) => id !== userId);
    if (!uniqueMemberIds.length) {
      return res.status(400).json({ message: "Cần chọn ít nhất một thành viên khác" });
    }
    if (type === "direct" && uniqueMemberIds.length !== 1) {
      return res.status(400).json({ message: "Cuộc trò chuyện cá nhân chỉ có hai thành viên" });
    }

    let conversation;
    if (type === "direct") {
      const [first, second] = [userId, uniqueMemberIds[0]].sort();
      const directKey = `${first}:${second}`;
      conversation = await prisma.conversation.findUnique({
        where: { directKey },
        include: conversationInclude,
      });

      if (!conversation) {
        try {
          conversation = await prisma.$transaction(async (tx) => {
            const created = await tx.conversation.create({
              data: {
                type: "direct",
                directKey,
                lastMessageAt: new Date(),
                participants: {
                  create: [{ userId }, { userId: uniqueMemberIds[0] }],
                },
              },
            });
            return tx.conversation.findUniqueOrThrow({
              where: { id: created.id },
              include: conversationInclude,
            });
          });
        } catch (error) {
          if (error?.code !== "P2002") throw error;
          conversation = await prisma.conversation.findUnique({
            where: { directKey },
            include: conversationInclude,
          });
          if (!conversation) throw error;
        }
      }
    } else {
      conversation = await prisma.$transaction(async (tx) => {
        const created = await tx.conversation.create({
          data: {
            type: "group",
            name: name.trim(),
            createdById: userId,
            lastMessageAt: new Date(),
            participants: {
              create: [userId, ...uniqueMemberIds].map((participantId) => ({
                userId: participantId,
              })),
            },
          },
        });
        return tx.conversation.findUniqueOrThrow({
          where: { id: created.id },
          include: conversationInclude,
        });
      });
    }

    const formatted = formatConversation(conversation);
    const recipientIds =
      type === "direct" ? [userId, uniqueMemberIds[0]] : uniqueMemberIds;
    recipientIds.forEach((participantId) => {
      io.to(participantId).emit("new-group", formatted);
    });

    return res.status(201).json({ conversation: formatted });
  } catch (error) {
    console.error("Lỗi khi tạo conversation", error);
    if (error?.code === "P2003" || error?.code === "P2025") {
      return res.status(404).json({ message: "Một hoặc nhiều người dùng không tồn tại" });
    }
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const getConversations = async (req, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { participants: { some: { userId: req.user._id } } },
      orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
      include: conversationInclude,
    });

    return res.status(200).json({
      conversations: conversations.map(formatConversation),
    });
  } catch (error) {
    console.error("Lỗi xảy ra khi lấy conversations", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const parsedLimit = Number(req.query.limit ?? 50);
    const limit = Number.isInteger(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 100)
      : 50;
    const rawCursor = req.query.cursor ? String(req.query.cursor) : null;
    const separatorIndex = rawCursor?.lastIndexOf("|") ?? -1;
    const cursorId = separatorIndex >= 0 ? rawCursor.slice(separatorIndex + 1) : null;
    const cursorDate = rawCursor
      ? new Date(separatorIndex >= 0 ? rawCursor.slice(0, separatorIndex) : rawCursor)
      : null;

    if (
      cursorDate &&
      (Number.isNaN(cursorDate.getTime()) || (separatorIndex >= 0 && !cursorId))
    ) {
      return res.status(400).json({ message: "cursor không hợp lệ" });
    }

    let messages = await prisma.message.findMany({
      where: {
        conversationId,
        conversation: {
          participants: { some: { userId: req.user._id } },
        },
        ...(cursorDate
          ? {
              OR: [
                { createdAt: { lt: cursorDate } },
                ...(cursorId ? [{ createdAt: cursorDate, id: { lt: cursorId } }] : []),
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        content: true,
        imgUrl: true,
        fileUrl: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        messageType: true,
        poll: {
          include: {
            options: {
              orderBy: { position: "asc" },
              include: { _count: { select: { votes: true } } },
            },
            votes: {
              where: { userId: req.user._id },
              select: { optionId: true },
              take: 1,
            },
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!messages.length) {
      const membership = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId: req.user._id } },
        select: { userId: true },
      });
      if (!membership) {
        return res.status(404).json({ message: "Conversation không tồn tại" });
      }
    }

    let nextCursor = null;
    if (messages.length > limit) {
      const lastMessage = messages[limit - 1];
      nextCursor = `${lastMessage.createdAt.toISOString()}|${lastMessage.id}`;
      messages = messages.slice(0, limit);
    }

    return res.status(200).json({
      messages: messages.reverse().map((message) => ({
        _id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        content: message.content,
        imgUrl: message.imgUrl,
        fileUrl: message.fileUrl,
        fileName: message.fileName,
        fileSize: message.fileSize,
        mimeType: message.mimeType,
        messageType: message.messageType,
        poll: formatPoll(message.poll),
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      })),
      nextCursor,
    });
  } catch (error) {
    console.error("Lỗi xảy ra khi lấy messages", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const getUserConversationsForSocketIO = async (userId) => {
  const conversations = await prisma.conversationParticipant.findMany({
    where: { userId },
    select: { conversationId: true },
  });
  return conversations.map(({ conversationId }) => conversationId);
};

export const markAsSeen = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const updated = await prisma.$transaction(async (tx) => {
      const participant = await tx.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
      });
      if (!participant) return null;

      const conversation = await tx.conversation.findUnique({
        where: { id: conversationId },
        include: {
          lastMessage: true,
          participants: {
            include: {
              user: { select: { id: true, displayName: true, avatarUrl: true } },
            },
          },
        },
      });
      if (!conversation) return null;
      if (!conversation.lastMessage || conversation.lastMessage.senderId === userId) {
        return { conversation, unchanged: true };
      }

      await tx.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { unreadCount: 0, lastSeenAt: new Date() },
      });

      const refreshed = await tx.conversation.findUniqueOrThrow({
        where: { id: conversationId },
        include: conversationInclude,
      });
      return { conversation: refreshed, unchanged: false };
    });

    if (!updated) {
      return res.status(404).json({ message: "Conversation không tồn tại" });
    }
    if (updated.unchanged) {
      return res.status(200).json({ message: "Không có tin nhắn mới để mark as seen" });
    }

    const formatted = formatConversation(updated.conversation);
    io.to(conversationId).emit("read-message", {
      conversation: formatted,
      lastMessage: formatted.lastMessage,
    });

    return res.status(200).json({
      message: "Marked as seen",
      seenBy: formatted.seenBy,
      myUnreadCount: formatted.unreadCounts[userId] ?? 0,
    });
  } catch (error) {
    console.error("Lỗi khi mark as seen", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
