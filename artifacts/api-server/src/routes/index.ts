import { Router, type IRouter } from "express";
import healthRouter from "./health";
import battleRouter from "./battle";

const router: IRouter = Router();

router.use(healthRouter);
router.use(battleRouter);

export default router;
