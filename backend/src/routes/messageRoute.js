import express from "express";

import {
  sendDirectMessage,
  sendGroupMessage,
  createGroupPoll,
  votePoll,
  downloadMessageFile,
} from "../controllers/messageController.js";
import {
  checkFriendship,
  checkGroupMembership,
} from "../middlewares/friendMiddleware.js";
import { uploadMessageAttachment } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.post("/group/poll", checkGroupMembership, createGroupPoll);
router.post("/:messageId/poll/vote", votePoll);
router.get("/:messageId/file", downloadMessageFile);
router.post("/direct", checkFriendship, uploadMessageAttachment, sendDirectMessage);
router.post("/group", checkGroupMembership, uploadMessageAttachment, sendGroupMessage);

export default router;
