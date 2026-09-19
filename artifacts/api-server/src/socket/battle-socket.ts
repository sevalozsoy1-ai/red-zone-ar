import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import {
  authenticateBattleSession,
  fireShotByPlayerId,
  getPublicBattleSnapshot,
  type BattleFireMode,
} from "../lib/battle-store";

const ROOM_PREFIX = "battle:";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_ID_LENGTH = 128;

type ShotIntent = {
  shotId: string;
  targetPlayerId: string;
  weaponId: string;
  fireMode: BattleFireMode;
  clientFiredAt: number;
};

type AuthenticatedSocket = Socket & {
  data: {
    roomCode: string;
    playerId: string;
    sessionToken: string;
  };
};

function text(value: unknown) {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_ID_LENGTH
    ? value
    : undefined;
}

function parseShotIntent(value: unknown): ShotIntent | undefined {
  if (!value || typeof value !== "object") return undefined;
  const input = value as Record<string, unknown>;
  const shotId = text(input.shotId);
  const targetPlayerId = text(input.targetPlayerId);
  const weaponId = text(input.weaponId);
  const fireMode = input.fireMode === "primary" || input.fireMode === "throw" ? input.fireMode : undefined;
  const clientFiredAt = typeof input.clientFiredAt === "number" && Number.isFinite(input.clientFiredAt)
    ? input.clientFiredAt
    : undefined;
  if (!shotId || !UUID_PATTERN.test(shotId) || !targetPlayerId || !weaponId || !fireMode || clientFiredAt === undefined) {
    return undefined;
  }
  return { shotId, targetPlayerId, weaponId, fireMode, clientFiredAt };
}

function authValues(socket: Socket) {
  const auth = socket.handshake.auth;
  if (!auth || typeof auth !== "object") return undefined;
  const values = auth as Record<string, unknown>;
  const roomCode = text(values.roomCode)?.toUpperCase();
  const sessionToken = text(values.sessionToken);
  if (!roomCode || !sessionToken) return undefined;
  return { roomCode, sessionToken };
}

export function attachBattleSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    path: "/api/socket.io",
    cors: { origin: true, credentials: false },
  });

  io.use(async (socket, next) => {
    const auth = authValues(socket);
    if (!auth) {
      next(new Error("UNAUTHORIZED"));
      return;
    }
    try {
      const session = await authenticateBattleSession(auth.roomCode, auth.sessionToken);
      socket.data.roomCode = session.roomCode;
      socket.data.playerId = session.playerId;
      socket.data.sessionToken = auth.sessionToken;
      next();
    } catch {
      next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", (socket) => {
    const authenticated = socket as AuthenticatedSocket;
    authenticated.join(`${ROOM_PREFIX}${authenticated.data.roomCode}`);

    authenticated.emit("battle:connected", {
      roomCode: authenticated.data.roomCode,
      playerId: authenticated.data.playerId,
    });
    void getPublicBattleSnapshot(authenticated.data.roomCode, authenticated.data.sessionToken)
      .then((state) => authenticated.emit("battle:state", state))
      .catch(() => undefined);

    authenticated.on("battle:shot-intent", async (payload: unknown, acknowledge?: (response: unknown) => void) => {
      const intent = parseShotIntent(payload);
      if (!intent) {
        acknowledge?.({ accepted: false, reason: "INVALID_SHOT_INTENT" });
        return;
      }
      try {
        const result = await fireShotByPlayerId(
          authenticated.data.roomCode,
          authenticated.data.sessionToken,
          intent.shotId,
          intent.targetPlayerId,
          intent.clientFiredAt,
          intent.weaponId,
          intent.fireMode,
        );
        acknowledge?.({
          accepted: result.accepted,
          reason: result.reason,
          shotId: intent.shotId,
          shooterId: result.shooterId,
          targetId: result.targetId,
          damage: result.damage,
          eliminated: result.eliminated,
        });
        if (!result.duplicate && result.accepted && result.damage > 0) {
          io.to(`${ROOM_PREFIX}${authenticated.data.roomCode}`).emit("battle:hit-confirmed", {
            shotId: intent.shotId,
            shooterId: result.shooterId,
            targetId: result.targetId,
            damage: result.damage,
            eliminated: result.eliminated,
          });
        }
        // Push the authoritative snapshot immediately. REST polling remains
        // the recovery path, but combat no longer waits for its next tick.
        const roomName = `${ROOM_PREFIX}${authenticated.data.roomCode}`;
        const sockets = await io.in(roomName).fetchSockets();
        await Promise.all(sockets.map(async (roomSocket) => {
          const viewer = roomSocket as unknown as AuthenticatedSocket;
          try {
            const state = await getPublicBattleSnapshot(
              viewer.data.roomCode,
              viewer.data.sessionToken,
            );
            viewer.emit("battle:state", state);
          } catch {
            // The socket's next reconnect/REST recovery handles an expired
            // session; never send another player's filtered snapshot.
          }
        }));
      } catch {
        acknowledge?.({ accepted: false, reason: "SHOT_FAILED", shotId: intent.shotId });
      }
    });
  });

  return io;
}