import jwt from "jsonwebtoken";
import prisma from "../libs/prisma.js";

// authorization - xác minh user là ai
export const protectedRoute = async (req, res, next) => {
  try {
    // lấy token từ header
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({ message: "Không tìm thấy access token" });
    }

    // xác nhận token hợp lệ
    const decodedUser = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    if (!decodedUser || typeof decodedUser === "string" || !decodedUser.userId) {
      return res.status(403).json({ message: "Access token hết hạn hoặc không đúng" });
    }
    const user = await prisma.user.findUnique({
      where: { id: decodedUser.userId },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        avatarId: true,
        bio: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "người dùng không tồn tại." });
    }

    req.user = { ...user, _id: user.id };
    return next();
  } catch (error) {
    if (error?.name === "JsonWebTokenError" || error?.name === "TokenExpiredError") {
      return res.status(403).json({ message: "Access token hết hạn hoặc không đúng" });
    }
    console.error("Lỗi khi xác minh JWT trong authMiddleware", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
