import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import scenariosRouter from "./scenarios.js";
import recommendationsRouter from "./recommendations.js";
import memoryRouter from "./memory.js";
import dashboardRouter from "./dashboard.js";
import agentsRouter from "./agents.js";
import knowledgeRouter from "./knowledge.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(scenariosRouter);
router.use(recommendationsRouter);
router.use(memoryRouter);
router.use(dashboardRouter);
router.use(agentsRouter);
router.use(knowledgeRouter);

export default router;
