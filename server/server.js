import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import connectDB from "./config/mongodb.js";
import imageRouters from "./routes/imageRouters.js";
import { requireDatabase } from "./middlewares/database.js";
import userRoutes from "./routes/userRoutes.js";
import workspaceRoutes from "./routes/workspaceRoutes.js";

const app = express();
const port = process.env.PORT || 8080;
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
].filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || process.env.NODE_ENV !== "production" || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/", (_req, res) => {
  res.json({ message: "IPO Light API is running" });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", database: app.locals.dbReady ? "connected" : "disconnected" });
});

app.use("/api/auth", requireDatabase, userRoutes);
app.use("/api/workspace", requireDatabase, workspaceRoutes);
app.use("/api/images", imageRouters);

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({ message: error.message || "Server error" });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

connectDB()
  .then(() => {
    app.locals.dbReady = true;
  })
  .catch((error) => {
    app.locals.dbReady = false;
    console.error("MongoDB connection failed:", error.message);
  });
