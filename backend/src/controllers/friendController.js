import prisma from "../libs/prisma.js";

const userSummary = (user) => ({
  _id: user.id,
  username: user.username,
  displayName: user.displayName,
  avatarUrl: user.avatarUrl,
});

export const sendFriendRequest = async (req, res) => {
  try {
    const { to, message } = req.body;
    const from = req.user._id;

    if (typeof to !== "string" || !to) {
      return res.status(400).json({ message: "Cần cung cấp người nhận" });
    }
    if (from === to) {
      return res
        .status(400)
        .json({ message: "Không thể gửi lời mời kết bạn cho chính mình" });
    }

    const userExists = await prisma.user.findUnique({
      where: { id: to },
      select: { id: true },
    });
    if (!userExists) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    const [userA, userB] = [from, to].sort();
    const request = await prisma.$transaction(
      async (tx) => {
        const [alreadyFriends, existingRequest] = await Promise.all([
          tx.friend.findUnique({ where: { userA_userB: { userA, userB } } }),
          tx.friendRequest.findFirst({
            where: {
              status: "PENDING",
              OR: [
                { fromId: from, toId: to },
                { fromId: to, toId: from },
              ],
            },
          }),
        ]);
        if (alreadyFriends) {
          throw Object.assign(new Error("Hai người đã là bạn bè"), { status: 400 });
        }
        if (existingRequest) {
          throw Object.assign(new Error("Đã có lời mời kết bạn đang chờ"), { status: 400 });
        }
        return tx.friendRequest.create({
          data: { fromId: from, toId: to, message: message || null },
        });
      },
      { isolationLevel: "Serializable" }
    );
    return res.status(201).json({
      message: "Gửi lời mời kết bạn thành công",
      request: {
        _id: request.id,
        from: request.fromId,
        to: request.toId,
        message: request.message,
        status: request.status,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
      },
    });
  } catch (error) {
    console.error("Lỗi khi gửi yêu cầu kết bạn", error);
    if (error?.status === 400) {
      return res.status(400).json({ message: error.message });
    }
    if (error?.code === "P2002") {
      return res.status(409).json({ message: "Đã có lời mời kết bạn đang chờ" });
    }
    if (error?.code === "P2034") {
      return res.status(409).json({ message: "Đã có lời mời kết bạn đang chờ" });
    }
    if (error?.code === "P2003") {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    const acceptedUser = await prisma.$transaction(async (tx) => {
      const request = await tx.friendRequest.findUnique({
        where: { id: requestId },
      });
      if (!request) return { error: "missing" };
      if (request.toId !== userId) return { error: "forbidden" };

      const [userA, userB] = [request.fromId, request.toId].sort();
      await tx.friend.upsert({
        where: { userA_userB: { userA, userB } },
        create: { userA, userB },
        update: {},
      });
      await tx.friendRequest.delete({ where: { id: requestId } });
      const user = await tx.user.findUnique({
        where: { id: request.fromId },
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      });
      return { user };
    }, { isolationLevel: "Serializable" });

    if (acceptedUser.error === "missing") {
      return res.status(404).json({ message: "Không tìm thấy lời mời kết bạn" });
    }
    if (acceptedUser.error === "forbidden") {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền chấp nhận lời mời này" });
    }
    const newFriend = userSummary(acceptedUser.user);
    return res.status(200).json({
      message: "Chấp nhận lời mời kết bạn thành công",
      newFriend,
      requestAcceptedBy: newFriend,
    });
  } catch (error) {
    console.error("Lỗi khi chấp nhận lời mời kết bạn", error);
    if (error?.code === "P2034" || error?.code === "P2002" || error?.code === "P2025") {
      return res.status(409).json({ message: "Lời mời đã được xử lý" });
    }
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const declineFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return res.status(404).json({ message: "Không tìm thấy lời mời kết bạn" });
    }
    if (request.toId !== req.user._id) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền từ chối lời mời này" });
    }

    await prisma.friendRequest.delete({ where: { id: requestId } });
    return res.sendStatus(204);
  } catch (error) {
    console.error("Lỗi khi từ chối lời mời kết bạn", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const getAllFriends = async (req, res) => {
  try {
    const userId = req.user._id;
    const friendships = await prisma.friend.findMany({
      where: { OR: [{ userA: userId }, { userB: userId }] },
      include: {
        userARef: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        userBRef: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    const friends = friendships.map((friendship) =>
      userSummary(friendship.userA === userId ? friendship.userBRef : friendship.userARef)
    );
    return res.status(200).json({ friends });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách bạn bè", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const getFriendRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    const [sent, received] = await Promise.all([
      prisma.friendRequest.findMany({
        where: { fromId: userId, status: "PENDING" },
        include: {
          receiver: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.friendRequest.findMany({
        where: { toId: userId, status: "PENDING" },
        include: {
          sender: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return res.status(200).json({
      sent: sent.map((request) => ({
        _id: request.id,
        from: request.fromId,
        to: userSummary(request.receiver),
        message: request.message,
        status: request.status,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
      })),
      received: received.map((request) => ({
        _id: request.id,
        from: userSummary(request.sender),
        to: request.toId,
        message: request.message,
        status: request.status,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách yêu cầu kết bạn", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
