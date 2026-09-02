import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { builderSchemaRouter } from "./routes/builderSchema.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/__appoponi/schema", builderSchemaRouter);

app.listen(port, () => {
  console.log(`Appoponi backend running on http://localhost:${port}`);
});
