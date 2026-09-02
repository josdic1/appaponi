import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { builderSchemaRouter } from "./routes/builderSchema.js";
import { authRouter } from "./routes/auth.js";
import { accountsRouter } from "./routes/accounts.js";
import { householdMembersRouter } from "./routes/householdMembers.js";
import { staffMembersRouter } from "./routes/staffMembers.js";

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
app.use("/api/auth", authRouter);
app.use("/api/accounts", accountsRouter);
app.use("/api/household-members", householdMembersRouter);
app.use("/api/staff-members", staffMembersRouter);

app.listen(port, () => {
  console.log(`Appoponi backend running on http://localhost:${port}`);
});
