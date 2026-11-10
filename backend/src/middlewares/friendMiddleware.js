import prisma from "../libs/prisma.js";

const pair = (a, b) => (a < b ? [a, b] : [b, a]);

export const checkFriendship = async (req, res, next) => {
  try {
    const me = req.user._id.toString();
    const recipientId = req.body?.recipientId ?? req.query?.recipientId ?? null;
    const memberIds = req.body?.memberIds ?? [];

    if (!recipientId && !Array.isArray(memberIds)) {
      return res.status(400).json({ message: "memberIds phải là một danh sách" });
    }
    if (!recipientId && memberIds.length === 0) {
      return res
        .status(400)
        .json({ message: "Cần cung cấp recipientId hoặc memberIds" });
    }

    if (recipientId) {
      if (typeof recipientId !== "string" || recipientId === me) {
        return res.status(400).json({ message: "Người nhận không hợp lệ" });
      }
      const [userA, userB] = pair(me, recipientId);

      const isFriend = await prisma.friend.findUnique({
        where: { userA_userB: { userA, userB } },
      });

      if (!isFriend) {
        return res.status(403).json({ message: "Bạn chưa kết bạn với người này" });
      }

      return next();
    }

    if (memberIds.some((memberId) => typeof memberId !== "string" || !memberId || memberId === me)) {
      return res.status(400).json({ message: "Danh sách thành viên không hợp lệ" });
    }
    const memberPairs = memberIds.map((memberId) => {
      const [userA, userB] = pair(me, memberId);
      return { userA, userB, memberId };
    });
    const friendships = await prisma.friend.findMany({
      where: {
        OR: memberPairs.map(({ userA, userB }) => ({ userA, userB })),
      },
      select: { userA: true, userB: true },
    });
    const friendshipKeys = new Set(
      friendships.map(({ userA, userB }) => `${userA}:${userB}`)
    );
    const notFriends = memberPairs
      .filter(({ userA, userB }) => !friendshipKeys.has(`${userA}:${userB}`))
      .map(({ memberId }) => memberId);

    if (notFriends.length > 0) {
      return res
        .status(403)
        .json({ message: "Bạn chỉ có thể thêm bạn bè vào nhóm.", notFriends });
    }

    return next();
  } catch (error) {
    console.error("Lỗi xảy ra khi checkFriendship:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const checkGroupMembership = async (req, res, next) => {
  try {
    const conversationId = req.body?.conversationId ?? req.query?.conversationId;
    const userId = req.user._id;

    if (!conversationId) {
      return res.status(400).json({ message: "Cần cung cấp conversationId" });
    }
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation) {
      return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
    }

    const isMember = conversation.participants.some((p) => p.userId === userId);

    if (!isMember) {
      return res.status(403).json({ message: "Bạn không ở trong group này." });
    }

    req.conversation = conversation;

    return next();
  } catch (error) {
    console.error("Lỗi checkGroupMembership:", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
