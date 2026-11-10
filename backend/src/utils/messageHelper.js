export const emitNewMessage = (io, conversation, message, clientMessageId) => {
  const unreadCounts = Object.fromEntries(
    conversation.participants.map(({ userId, unreadCount }) => [userId, unreadCount])
  );
  io.to(conversation.id).emit("new-message", {
    message,
    clientMessageId,
    conversation: {
      _id: conversation.id,
      lastMessage: {
        _id: message._id,
        content: message.content,
        imgUrl: message.imgUrl,
        fileName: message.fileName,
        messageType: message.messageType,
        poll: message.poll ? { question: message.poll.question } : null,
        senderId: message.senderId,
        createdAt: message.createdAt,
      },
      lastMessageAt: conversation.lastMessageAt,
    },
    unreadCounts,
  });
};
