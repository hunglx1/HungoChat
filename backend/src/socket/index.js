import { Server } from "socket.io";
import http from "http";
import express from "express";
import { socketAuthMiddleware } from "../middlewares/socketMiddleware.js";
import { getUserConversationsForSocketIO } from "../controllers/conversationController.js";
import prisma from "../libs/prisma.js";

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});

io.use(socketAuthMiddleware);

const onlineUsers = new Map();
const activeCalls = new Map();
const activeCallByUser = new Map();

const removeCall = (callId) => {
  const call = activeCalls.get(callId);
  if (!call) return null;
  clearTimeout(call.timeout);
  activeCalls.delete(callId);
  activeCallByUser.delete(call.callerId);
  activeCallByUser.delete(call.calleeId);
  return call;
};

const validCallId = (callId) =>
  typeof callId === "string" && callId.length > 0 && callId.length <= 100;

const isSessionDescription = (description, type) =>
  description &&
  typeof description === "object" &&
  description.type === type &&
  typeof description.sdp === "string" &&
  description.sdp.length <= 100_000;

io.on("connection", async (socket) => {
  const user = socket.user;

  const userSockets = onlineUsers.get(user._id) ?? new Set();
  userSockets.add(socket.id);
  onlineUsers.set(user._id, userSockets);
  socket.join(user._id);
  io.emit("online-users", Array.from(onlineUsers.keys()));

  try {
    const conversationIds = await getUserConversationsForSocketIO(user._id);
    await Promise.all(conversationIds.map((id) => socket.join(id)));
  } catch (error) {
    console.error("Lỗi khi tải conversations cho socket", error);
    socket.disconnect(true);
    return;
  }

  socket.on("join-conversation", async (conversationId) => {
    if (typeof conversationId !== "string" || !conversationId) return;
    try {
      const membership = await prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId: user._id,
          },
        },
        select: { userId: true },
      });
      if (membership) await socket.join(conversationId);
    } catch (error) {
      console.error("Lỗi khi tham gia conversation qua socket", error);
    }
  });

  socket.on("call:invite", async (payload, acknowledge) => {
    const respond = typeof acknowledge === "function" ? acknowledge : () => {};
    const { callId, conversationId, targetUserId, offer } = payload ?? {};
    if (
      !validCallId(callId) ||
      typeof conversationId !== "string" ||
      typeof targetUserId !== "string" ||
      targetUserId === user._id ||
      !isSessionDescription(offer, "offer")
    ) {
      respond({ ok: false, message: "Thông tin cuộc gọi không hợp lệ" });
      return;
    }

    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: {
          type: true,
          participants: { select: { userId: true } },
        },
      });
      const participantIds = conversation?.participants.map(({ userId }) => userId) ?? [];
      if (
        conversation?.type !== "direct" ||
        !participantIds.includes(user._id) ||
        !participantIds.includes(targetUserId)
      ) {
        respond({ ok: false, message: "Bạn không thể gọi cuộc trò chuyện này" });
        return;
      }
      if (!onlineUsers.has(targetUserId)) {
        respond({ ok: false, message: "Người nhận hiện không trực tuyến" });
        return;
      }
      if (
        activeCalls.has(callId) ||
        activeCallByUser.has(user._id) ||
        activeCallByUser.has(targetUserId)
      ) {
        respond({ ok: false, message: "Một trong hai người đang có cuộc gọi khác" });
        return;
      }

      const call = {
        conversationId,
        callerId: user._id,
        calleeId: targetUserId,
        timeout: null,
      };
      call.timeout = setTimeout(() => {
        const expired = removeCall(callId);
        if (expired) {
          io.to(expired.callerId).emit("call:ended", { callId, reason: "timeout" });
          io.to(expired.calleeId).emit("call:ended", { callId, reason: "timeout" });
        }
      }, 60_000);
      call.timeout.unref?.();
      activeCalls.set(callId, call);
      activeCallByUser.set(user._id, callId);
      activeCallByUser.set(targetUserId, callId);
      io.to(targetUserId).emit("call:incoming", {
        callId,
        conversationId,
        callerId: user._id,
        callerName: user.displayName,
        offer,
      });
      respond({ ok: true });
    } catch (error) {
      console.error("Lỗi khi bắt đầu cuộc gọi video", error);
      respond({ ok: false, message: "Không thể bắt đầu cuộc gọi" });
    }
  });

  socket.on("call:answer", (payload, acknowledge) => {
    const respond = typeof acknowledge === "function" ? acknowledge : () => {};
    const { callId, answer } = payload ?? {};
    const call = validCallId(callId) ? activeCalls.get(callId) : null;
    if (!call || call.calleeId !== user._id || !isSessionDescription(answer, "answer")) {
      respond({ ok: false, message: "Cuộc gọi không còn khả dụng" });
      return;
    }
    clearTimeout(call.timeout);
    io.to(call.callerId).emit("call:accepted", { callId, answer });
    respond({ ok: true });
  });

  socket.on("call:ice-candidate", (payload) => {
    const { callId, candidate } = payload ?? {};
    const call = validCallId(callId) ? activeCalls.get(callId) : null;
    if (
      !call ||
      (call.callerId !== user._id && call.calleeId !== user._id) ||
      !candidate ||
      typeof candidate !== "object"
    ) {
      return;
    }
    const recipientId = call.callerId === user._id ? call.calleeId : call.callerId;
    io.to(recipientId).emit("call:ice-candidate", { callId, candidate });
  });

  socket.on("call:decline", (payload) => {
    const { callId } = payload ?? {};
    const call = validCallId(callId) ? activeCalls.get(callId) : null;
    if (!call || (call.callerId !== user._id && call.calleeId !== user._id)) return;
    const declined = removeCall(callId);
    const recipientId = declined.callerId === user._id ? declined.calleeId : declined.callerId;
    io.to(recipientId).emit("call:declined", { callId });
  });

  socket.on("call:end", (payload) => {
    const { callId } = payload ?? {};
    const call = validCallId(callId) ? activeCalls.get(callId) : null;
    if (!call || (call.callerId !== user._id && call.calleeId !== user._id)) return;
    const ended = removeCall(callId);
    io.to(ended.callerId).emit("call:ended", { callId });
    io.to(ended.calleeId).emit("call:ended", { callId });
  });

  socket.on("disconnect", () => {
    const callId = activeCallByUser.get(user._id);
    const call = callId ? removeCall(callId) : null;
    if (call) {
      const recipientId = call.callerId === user._id ? call.calleeId : call.callerId;
      io.to(recipientId).emit("call:ended", { callId, reason: "disconnected" });
    }
    const sockets = onlineUsers.get(user._id);
    sockets?.delete(socket.id);
    if (!sockets?.size) onlineUsers.delete(user._id);
    io.emit("online-users", Array.from(onlineUsers.keys()));
  });
});

export { io, app, server };
