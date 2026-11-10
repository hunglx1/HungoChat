import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "crypto";
import path from "path";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 * 1, // 1MB
  },
});

export const uploadImageFromBuffer = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "moji_chat/avatars",
        resource_type: "image",
        transformation: [{ width: 200, height: 200, crop: "fill" }],
        ...options,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(buffer);
  });
};

const blockedExtensions = new Set([
  ".bat",
  ".cmd",
  ".com",
  ".exe",
  ".html",
  ".hta",
  ".js",
  ".msi",
  ".ps1",
  ".scr",
  ".sh",
  ".svg",
]);
const blockedMimeTypes = new Set([
  "application/javascript",
  "application/x-msdownload",
  "application/x-sh",
  "text/html",
  "image/svg+xml",
]);

const messageAttachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (blockedExtensions.has(extension) || blockedMimeTypes.has(file.mimetype.toLowerCase())) {
      callback(new Error("Định dạng tệp này không được hỗ trợ"));
      return;
    }
    callback(null, true);
  },
}).single("file");

export const uploadMessageAttachment = (req, res, next) => {
  messageAttachmentUpload(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "Tệp đính kèm không được vượt quá 10 MB" });
    }
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ message: "Tệp đính kèm không hợp lệ" });
    }
    return res.status(400).json({ message: error.message });
  });
};

export const uploadMessageFileFromBuffer = (buffer, { fileName, mimeType }) =>
  new Promise((resolve, reject) => {
    const isImage = mimeType?.startsWith("image/");
    const candidateExtension = path.extname(fileName).toLowerCase();
    const extension =
      !isImage && /^\.[a-z0-9]{1,10}$/.test(candidateExtension)
        ? candidateExtension
        : "";
    const publicId = `${randomUUID()}${extension}`;
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "moji_chat/messages",
        resource_type: isImage ? "image" : "raw",
        public_id: publicId,
        use_filename: false,
        unique_filename: false,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (!result?.secure_url || !result.public_id) {
          reject(new Error("Cloudinary không trả về thông tin tệp đã tải lên"));
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            isImage,
          });
        }
      }
    );

    uploadStream.end(buffer);
  });
