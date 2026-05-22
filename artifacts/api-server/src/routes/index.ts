import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import collegesRouter from "./colleges.js";
import eventsRouter from "./events.js";
import registrationsRouter from "./registrations.js";
import superadminRouter from "./superadmin.js";
import bookmarksRouter from "./bookmarks.js";

const router: IRouter = Router();

const CATEGORIES = ["Cultural", "Technical", "Sports", "Literary", "Management", "Workshop", "Other"];

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/colleges", collegesRouter);
router.use("/events", eventsRouter);
router.use(registrationsRouter);
router.use("/superadmin", superadminRouter);
router.use("/bookmarks", bookmarksRouter);

router.get("/categories", (_req, res) => {
  res.json(CATEGORIES);
});

export default router;
