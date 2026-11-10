import { uploadImageFromBuffer } from "../middlewares/uploadMiddleware.js";
import prisma from "../libs/prisma.js";

export const authMe = async (req, res) => {
  try {
    const user = req.user; // lấy từ authMiddleware

    return res.status(200).json({
      user,
    });
  } catch (error) {
    console.error("Lỗi khi gọi authMe", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const searchUserByUsername = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || username.trim() === "") {
      return res.status(400).json({ message: "Cần cung cấp username trong query." });
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
      select: { id: true, displayName: true, username: true, avatarUrl: true },
    });

    return res.status(200).json({
      user: user
        ? {
            _id: user.id,
            displayName: user.displayName,
            username: user.username,
            avatarUrl: user.avatarUrl,
          }
        : null,
    });
  } catch (error) {
    console.error("Lỗi xảy ra khi searchUserByUsername", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const uploadAvatar = async (req, res) => {
  try {
    const file = req.file;
    const userId = req.user._id;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const result = await uploadImageFromBuffer(file.buffer);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: result.secure_url,
        avatarId: result.public_id,
      },
      select: { avatarUrl: true },
    });

    if (!updatedUser.avatarUrl) {
      return res.status(400).json({ message: "Avatar trả về null" });
    }

    return res.status(200).json({ avatarUrl: updatedUser.avatarUrl });
  } catch (error) {
    console.error("Lỗi xảy ra khi upload avatar", error);
    return res.status(500).json({ message: "Upload failed" });
  }
};
