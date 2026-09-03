import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth.js";
import { accountsRouter } from "./routes/accounts.js";
import { householdMembersRouter } from "./routes/householdMembers.js";
import { staffMembersRouter } from "./routes/staffMembers.js";
import { areasRouter } from "./routes/areas.js";
import { cabinsRouter } from "./routes/cabins.js";
import { activitiesRouter } from "./routes/activities.js";
import { eventTypesRouter } from "./routes/eventTypes.js";
import { eventsRouter } from "./routes/events.js";
import { qualificationsRouter } from "./routes/qualifications.js";
import { schedulingRouter } from "./routes/scheduling.js";
import { registrationsRouter } from "./routes/registrations.js";
import { memberParticipationRouter } from "./routes/memberParticipation.js";
import { staffDayRouter } from "./routes/staffDay.js";
import { mealsRouter } from "./routes/meals.js";
import { afterHoursRouter } from "./routes/afterHours.js";
import { babysittingRouter } from "./routes/babysitting.js";
import { notificationsRouter } from "./routes/notifications.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);

const frontendUrl =
  process.env.FRONTEND_URL ??
  (
    process.env.NODE_ENV === "production"
      ? null
      : "http://localhost:5173"
  );

if (!frontendUrl) {
  throw new Error(
    "FRONTEND_URL is required in production",
  );
}

const frontendOrigin =
  new URL(frontendUrl).origin;

app.use(
  cors({
    origin: frontendOrigin,
    credentials: true,
  }),
);

app.use((req, res, next) => {
  if (
    ["GET", "HEAD", "OPTIONS"].includes(
      req.method,
    )
  ) {
    next();
    return;
  }

  const origin =
    req.get("origin");

  if (
    origin &&
    origin !== frontendOrigin
  ) {
    res.status(403).json({
      error:
        "Invalid request origin",
    });
    return;
  }

  next();
});

app.use(express.json({ limit: "20mb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/accounts", accountsRouter);
app.use("/api/household-members", householdMembersRouter);
app.use("/api/staff-members", staffMembersRouter);
app.use("/api/areas", areasRouter);
app.use("/api/cabins", cabinsRouter);
app.use("/api/activities", activitiesRouter);
app.use("/api/event-types", eventTypesRouter);
app.use("/api/events", eventsRouter);
app.use("/api/qualifications", qualificationsRouter);
app.use("/api/scheduling", schedulingRouter);
app.use("/api/registrations", registrationsRouter);
app.use("/api/member", memberParticipationRouter);
app.use("/api/staff-day", staffDayRouter);
app.use("/api/meals", mealsRouter);
app.use("/api/after-hours", afterHoursRouter);
app.use("/api/babysitting", babysittingRouter);
app.use("/api/notifications", notificationsRouter);

app.listen(port, () => {
  console.log(`Appoponi backend running on http://localhost:${port}`);
});
