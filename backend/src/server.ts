import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { builderSchemaRouter } from "./routes/builderSchema.js";
import { authRouter } from "./routes/auth.js";
import { accountsRouter } from "./routes/accounts.js";
import { householdMembersRouter } from "./routes/householdMembers.js";
import { staffMembersRouter } from "./routes/staffMembers.js";
import { areasRouter } from "./routes/areas.js";
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
app.use("/api/areas", areasRouter);
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
