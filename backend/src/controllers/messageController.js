import prisma from "../libs/prisma.js";
import { emitNewMessage } from "../utils/messageHelper.js";
import { io } from "../socket/index.js";
import { uploadMessageFileFromBuffer } from "../middlewares/uploadMiddleware.js";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const serializeMessage = (message) => ({
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
  poll: message.poll
    ? {
        id: message.poll.id,
        question: message.poll.question,
        options: message.poll.options.map((option) => ({
          id: option.id,
          text: option.text,
          voteCount: option._count?.votes ?? 0,
        })),
        totalVotes: message.poll.options.reduce(
          (total, option) => total + (option._count?.votes ?? 0),
          0
        ),
        selectedOptionId: message.poll.votes?.[0]?.optionId ?? null,
      }
    : null,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
});

const saveMessage = async ({
  conversationId,
  senderId,
  content,
  imgUrl,
  attachment,
}) =>
  prisma.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: {
        conversationId,
        senderId,
        content: content?.trim() || null,
        imgUrl: imgUrl || null,
        fileUrl: attachment?.url ?? null,
        fileName: attachment?.fileName ?? null,
        fileSize: attachment?.fileSize ?? null,
        mimeType: attachment?.mimeType ?? null,
        messageType: attachment
          ? attachment.isImage
            ? "image"
            : "file"
          : imgUrl && !content?.trim()
            ? "image"
            : "text",
      },
    });

    await tx.conversation.update({
      where: { id: conversationId },
      data: { lastMessageId: message.id, lastMessageAt: message.createdAt },
    });
    await tx.conversationParticipant.updateMany({
      where: { conversationId, userId: { not: senderId } },
      data: { unreadCount: { increment: 1 } },
    });
    await tx.conversationParticipant.updateMany({
      where: { conversationId, userId: senderId },
      data: { unreadCount: 0 },
    });

    const conversation = await tx.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      include: {
        participants: {
          select: { userId: true, unreadCount: true },
        },
      },
    });
    return { message, conversation };
  });

const sendMessageResponse = (res, result, clientMessageId) => {
  const message = serializeMessage(result.message);
  emitNewMessage(io, result.conversation, message, clientMessageId);
  return res.status(201).json({ message, clientMessageId });
};

const uploadAttachment = async (file) => {
  if (!file) return null;

  const fileName =
    file.originalname
      .split(/[\\/]/)
      .pop()
      ?.replace(/[\u0000-\u001f\u007f]/g, "")
      .slice(0, 255) || "attachment";
  const uploaded = await uploadMessageFileFromBuffer(file.buffer, {
    fileName,
    mimeType: file.mimetype,
  });

  return {
    ...uploaded,
    fileName,
    fileSize: file.size,
    mimeType: file.mimetype || "application/octet-stream",
  };
};

export const sendDirectMessage = async (req, res) => {
  try {
    const { recipientId, content, imgUrl, conversationId, clientMessageId } = req.body;
    const senderId = req.user._id;

    if ((!content?.trim() && !imgUrl && !req.file) || !recipientId) {
      return res.status(400).json({ message: "Cần nội dung, hình ảnh hoặc tệp đính kèm và người nhận" });
    }

    const [first, second] = [senderId, recipientId].sort();
    const directKey = `${first}:${second}`;
    let activeConversationId = conversationId;

    if (conversationId) {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { participants: { select: { userId: true } } },
      });
      if (
        !conversation ||
        conversation.type !== "direct" ||
        !conversation.participants.some(({ userId }) => userId === senderId) ||
        !conversation.participants.some(({ userId }) => userId === recipientId)
      ) {
        return res.status(404).json({ message: "Conversation không tồn tại" });
      }
    } else {
      const conversation = await prisma.conversation.findUnique({
        where: { directKey },
        select: { id: true },
      });
      if (conversation) {
        activeConversationId = conversation.id;
      } else {
        try {
          const created = await prisma.$transaction(async (tx) => {
            const direct = await tx.conversation.create({
              data: {
                type: "direct",
                directKey,
                participants: {
                  create: [{ userId: senderId }, { userId: recipientId }],
                },
              },
            });
            return direct.id;
          });
          activeConversationId = created;
        } catch (error) {
          if (error?.code !== "P2002") throw error;
          const existing = await prisma.conversation.findUnique({
            where: { directKey },
            select: { id: true },
          });
          if (!existing) throw error;
          activeConversationId = existing.id;
        }
      }
    }

    const attachment = await uploadAttachment(req.file);
    const result = await saveMessage({
      conversationId: activeConversationId,
      senderId,
      content,
      imgUrl: attachment?.isImage ? attachment.url : imgUrl,
      attachment,
    });
    return sendMessageResponse(res, result, clientMessageId);
  } catch (error) {
    console.error("Lỗi xảy ra khi gửi tin nhắn trực tiếp", error);
    if (error?.code === "P2003" || error?.code === "P2025") {
      return res.status(404).json({ message: "Người dùng hoặc cuộc trò chuyện không tồn tại" });
    }
    if (error?.code === "P2034") {
      return res.status(409).json({ message: "Cuộc trò chuyện đang được cập nhật, hãy thử lại" });
    }
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    const { conversationId, content, imgUrl, clientMessageId } = req.body;
    const senderId = req.user._id;

    if (!content?.trim() && !imgUrl && !req.file) {
      return res.status(400).json({ message: "Cần nội dung, hình ảnh hoặc tệp đính kèm" });
    }
    if (!req.conversation.participants.some(({ userId }) => userId === senderId)) {
      return res.status(403).json({ message: "Bạn không ở trong cuộc trò chuyện này" });
    }

    const attachment = await uploadAttachment(req.file);
    const result = await saveMessage({
      conversationId,
      senderId,
      content,
      imgUrl: attachment?.isImage ? attachment.url : imgUrl,
      attachment,
    });
    return sendMessageResponse(res, result, clientMessageId);
  } catch (error) {
    console.error("Lỗi xảy ra khi gửi tin nhắn nhóm", error);
    if (error?.code === "P2025" || error?.code === "P2003") {
      return res.status(404).json({ message: "Conversation không tồn tại" });
    }
    if (error?.code === "P2034") {
      return res.status(409).json({ message: "Cuộc trò chuyện đang được cập nhật, hãy thử lại" });
    }
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

const pollInclude = (userId) => ({
  options: {
    orderBy: { position: "asc" },
    include: { _count: { select: { votes: true } } },
  },
  votes: {
    where: { userId },
    select: { optionId: true },
    take: 1,
  },
});

const validatePoll = (question, options) => {
  if (
    typeof question !== "string" ||
    !question.trim() ||
    question.trim().length > 500 ||
    !Array.isArray(options) ||
    options.length < 2 ||
    options.length > 10 ||
    options.some(
      (option) =>
        typeof option !== "string" ||
        !option.trim() ||
        option.trim().length > 160
    )
  ) {
    return false;
  }
  const normalizedOptions = options.map((option) => option.trim().toLocaleLowerCase());
  return new Set(normalizedOptions).size === normalizedOptions.length;
};

const createPollMessage = async ({
  conversationId,
  senderId,
  question,
  options,
}) =>
  prisma.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: {
        conversationId,
        senderId,
        messageType: "poll",
        poll: {
          create: {
            question: question.trim(),
            options: {
              create: options.map((text, position) => ({
                text: text.trim(),
                position,
              })),
            },
          },
        },
      },
      include: { poll: { include: pollInclude(senderId) } },
    });

    await tx.conversation.update({
      where: { id: conversationId },
      data: { lastMessageId: message.id, lastMessageAt: message.createdAt },
    });
    await tx.conversationParticipant.updateMany({
      where: { conversationId, userId: { not: senderId } },
      data: { unreadCount: { increment: 1 } },
    });
    await tx.conversationParticipant.updateMany({
      where: { conversationId, userId: senderId },
      data: { unreadCount: 0 },
    });

    const conversation = await tx.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      include: {
        participants: { select: { userId: true, unreadCount: true } },
      },
    });
    return { message, conversation };
  });

const createPollResponse = async (req, res, conversationId) => {
  const { question, options, clientMessageId } = req.body;
  if (!validatePoll(question, options)) {
    return res.status(400).json({
      message: "Bình chọn cần câu hỏi và từ 2 đến 10 lựa chọn hợp lệ, không trùng nhau",
    });
  }

  try {
    const result = await createPollMessage({
      conversationId,
      senderId: req.user._id,
      question,
      options,
    });
    return sendMessageResponse(res, result, clientMessageId);
  } catch (error) {
    console.error("Lỗi khi tạo bình chọn", error);
    return res.status(500).json({ message: "Không thể tạo bình chọn" });
  }
};

export const createGroupPoll = async (req, res) =>
  createPollResponse(req, res, req.conversation.id);

export const votePoll = async (req, res) => {
  const { messageId } = req.params;
  const { optionId } = req.body;
  if (typeof optionId !== "string" || !optionId) {
    return res.status(400).json({ message: "Lựa chọn không hợp lệ" });
  }

  try {
    const poll = await prisma.poll.findFirst({
      where: {
        messageId,
        message: {
          conversation: {
            type: "group",
            participants: { some: { userId: req.user._id } },
          },
        },
      },
      select: {
        id: true,
        message: { select: { conversationId: true } },
        options: { where: { id: optionId }, select: { id: true } },
      },
    });
    if (!poll || poll.options.length === 0) {
      return res.status(404).json({ message: "Bình chọn hoặc lựa chọn không tồn tại" });
    }

    await prisma.pollVote.upsert({
      where: {
        pollId_userId: { pollId: poll.id, userId: req.user._id },
      },
      create: {
        pollId: poll.id,
        optionId,
        userId: req.user._id,
      },
      update: { optionId, createdAt: new Date() },
    });

    const updatedPoll = await prisma.poll.findUniqueOrThrow({
      where: { id: poll.id },
      include: pollInclude(req.user._id),
    });
    const serialized = {
      id: updatedPoll.id,
      question: updatedPoll.question,
      options: updatedPoll.options.map((option) => ({
        id: option.id,
        text: option.text,
        voteCount: option._count.votes,
      })),
      totalVotes: updatedPoll.options.reduce(
        (total, option) => total + option._count.votes,
        0
      ),
    };

    io.to(poll.message.conversationId).emit("poll-updated", {
      messageId,
      poll: serialized,
    });
    const selectedOptionId = updatedPoll.votes[0]?.optionId ?? null;
    io.to(req.user._id).emit("poll-vote-selection", {
      messageId,
      selectedOptionId,
    });
    return res.status(200).json({ poll: { ...serialized, selectedOptionId } });
  } catch (error) {
    console.error("Lỗi khi ghi nhận lựa chọn bình chọn", error);
    return res.status(500).json({ message: "Không thể ghi nhận lựa chọn" });
  }
};

export const downloadMessageFile = async (req, res) => {
  try {
    const message = await prisma.message.findFirst({
      where: {
        id: req.params.messageId,
        fileUrl: { not: null },
        conversation: {
          participants: { some: { userId: req.user._id } },
        },
      },
      select: { fileUrl: true, fileName: true, mimeType: true },
    });
    if (!message?.fileUrl || !message.fileName) {
      return res.status(404).json({ message: "Không tìm thấy tệp đính kèm" });
    }

    const fileUrl = new URL(message.fileUrl);
    if (
      fileUrl.protocol !== "https:" ||
      fileUrl.hostname !== "res.cloudinary.com" ||
      !/\/(?:raw|image)\/upload\//.test(fileUrl.pathname)
    ) {
      console.error("URL tệp Cloudinary không hợp lệ", { messageId: req.params.messageId });
      return res.status(502).json({ message: "Không thể tải tệp này" });
    }

    const upstream = await fetch(fileUrl, { redirect: "error" });
    if (!upstream.ok || !upstream.body) {
      return res.status(502).json({ message: "Không thể tải tệp từ kho lưu trữ" });
    }

    const fallbackName = message.fileName.replace(/[^\x20-\x7E]|["\\;]/g, "_");
    const safeMimeType =
      message.mimeType && /^[\w!#$&^_.+-]+\/[\w!#$&^_.+-]+$/.test(message.mimeType)
        ? message.mimeType
        : "application/octet-stream";

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fallbackName || "download"}"; filename*=UTF-8''${encodeURIComponent(message.fileName)}`
    );
    res.setHeader("Content-Type", safeMimeType);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    await pipeline(Readable.fromWeb(upstream.body), res);
  } catch (error) {
    if (res.headersSent) {
      res.destroy(error);
      return;
    }
    console.error("Lỗi khi tải tệp đính kèm", error);
    return res.status(502).json({ message: "Không thể tải tệp đính kèm" });
  }
};
