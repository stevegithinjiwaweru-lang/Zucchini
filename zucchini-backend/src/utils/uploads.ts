import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOAD_ROOT = path.join(__dirname, "..", "..", "uploads");

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

const podDir = path.join(UPLOAD_ROOT, "pod");
ensureDir(podDir);

export const podUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, podDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed for proof of delivery"));
    }
    cb(null, true);
  },
});

// CSV parsed in memory — order sheets are small, no need to touch disk.
export const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith(".csv")) {
      return cb(new Error("Only .csv files are accepted"));
    }
    cb(null, true);
  },
});

export { UPLOAD_ROOT };
