import { Router, type IRouter } from "express";
import {
  CreateBattleRoomBody,
  FireNetworkBattleShotBody,
  FireNetworkBattleShotParams,
  GetBattleStateQueryParams,
  HeartbeatBattleRoomParams,
  JoinBattleRoomBody,
  JoinBattleRoomParams,
  LeaveBattleRoomParams,
  StartBattleRoomParams,
} from "@workspace/api-zod";
import {
  createRoom,
  registerShotIntent,
  getRoom,
  heartbeatRoom,
  joinRoom,
  leaveRoom,
  startRoom,
} from "../lib/battle-store";

const router: IRouter = Router();

const fail = (res: any, error: unknown) => {
  const message = error instanceof Error ? error.message : "INVALID_REQUEST";
  const status =
    message === "UNAUTHORIZED"
      ? 401
      : message === "HOST_ONLY"
        ? 403
        : message === "ROOM_NOT_FOUND"
          ? 404
          : message === "SESSION_EXPIRED"
            ? 410
            : message === "ROOM_FULL" || message === "ROOM_STARTED"
              ? 409
              : 400;
  res.status(status).json({ error: message });
};

function bearerToken(req: { header(name: string): string | undefined }) {
  const header = req.header("authorization")?.trim();
  if (!header || !/^Bearer\s+/i.test(header)) throw new Error("UNAUTHORIZED");
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("UNAUTHORIZED");
  return token;
}

function optionalBearerToken(req: { header(name: string): string | undefined }) {
  const header = req.header("authorization")?.trim();
  if (!header) return undefined;
  if (!/^Bearer\s+/i.test(header)) throw new Error("UNAUTHORIZED");
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("UNAUTHORIZED");
  return token;
}

router.post("/battle/rooms", async (req, res) => {
  const body = CreateBattleRoomBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  try { res.status(201).json(await createRoom(body.data.name, body.data.requestId)); } catch (error) { fail(res, error); }
});

router.post("/battle/rooms/:code/players", async (req, res) => {
  const params = JoinBattleRoomParams.safeParse(req.params);
  const body = JoinBattleRoomBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "INVALID_REQUEST" }); return; }
  try {
    res.json(await joinRoom(
      params.data.code,
      body.data.name,
      body.data.requestId,
      optionalBearerToken(req),
    ));
  } catch (error) { fail(res, error); }
});

router.get("/battle/state", async (req, res) => {
  const query = GetBattleStateQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: "INVALID_REQUEST" }); return; }
  try {
    res.setHeader("Cache-Control", "no-store");
    res.json(await getRoom(query.data.code, bearerToken(req)));
  } catch (error) { fail(res, error); }
});

router.post("/battle/rooms/:code/start", async (req, res) => {
  const params = StartBattleRoomParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "INVALID_REQUEST" }); return; }
  try { res.json(await startRoom(params.data.code, bearerToken(req))); } catch (error) { fail(res, error); }
});

router.delete("/battle/rooms/:code/session", async (req, res) => {
  const params = LeaveBattleRoomParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "INVALID_REQUEST" }); return; }
  try {
    await leaveRoom(params.data.code, bearerToken(req));
    res.status(204).send();
  } catch (error) { fail(res, error); }
});

router.post("/battle/rooms/:code/heartbeat", async (req, res) => {
  const params = HeartbeatBattleRoomParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "INVALID_REQUEST" }); return; }
  try { res.json(await heartbeatRoom(params.data.code, bearerToken(req))); } catch (error) { fail(res, error); }
});

router.post("/battle/rooms/:code/shots", (_req, res) => {
  // Old clients could supply a marker ID and bypass the target's camera.
  res.status(410).json({ error: "UPDATE_REQUIRED" });
});

router.post("/battle/rooms/:code/network-shots", async (req, res) => {
  const params = FireNetworkBattleShotParams.safeParse(req.params);
  const body = FireNetworkBattleShotBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "INVALID_REQUEST" }); return; }
  try {
    // A network shot is always pending until the authenticated target reports
    // the shooter's coded beacon. Never let a client disable that requirement.
    res.json(await registerShotIntent(
      params.data.code,
      bearerToken(req),
      body.data.shotId,
      body.data.targetPlayerId,
      body.data.firedAt,
      body.data.weaponId,
      body.data.fireMode,
    ));
  } catch (error) { fail(res, error); }
});

export default router;
