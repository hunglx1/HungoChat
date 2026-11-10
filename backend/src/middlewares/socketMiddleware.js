import jwt from "jsonwebtoken";
import prisma from "../libs/prisma.js";

export const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Unauthorized - Token không tồn tại"));
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    if (!decoded) {
      return next(new Error("Unauthorized - Token không hợp lệ hoặc đã hết hạn"));
    }

    if (typeof decoded === "string" || !decoded.userId) {
      return next(new Error("Unauthorized - Token không hợp lệ hoặc đã hết hạn"));
    }
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      return next(new Error("User không tồn tại"));
    }

    socket.user = { ...user, _id: user.id };

    next();
  } catch (error) {
    console.error("Lỗi khi verify JWT trong socketMiddleware", error);
    next(new Error("Unauthorized"));
  }
};
