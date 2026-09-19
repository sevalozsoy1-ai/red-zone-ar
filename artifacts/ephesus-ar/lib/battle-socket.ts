import { io, type Socket } from "socket.io-client";
import { useCallback, useEffect, useRef, useState } from "react";
import { resolveApiConfig } from "@/lib/api-config";
import { nextShotRetryDelay } from "@/lib/battle-socket-utils";

export type NetworkShotIntent = {
  shotId: string;
  targetPlayerId: string;
  weaponId: string;
  fireMode: "primary" | "throw";
  clientFiredAt: number;
};

export type NetworkHitConfirmed = {
  eventId?: string;
  shotId: string;
  shooterId: string;
  targetId: string;
  damage?: number;
  targetHp?: number;
  targetLives?: number;
};

export type NetworkShotRejected = {
  shotId?: string;
  reason?: string;
};
export type NetworkShotAck = NetworkShotRejected & { accepted?: boolean };
export type NetworkRoomState = {
  room: unknown;
  playerId?: string;
  sessionToken?: string;
};

export type BattleSocketStatus = "idle" | "connecting" | "connected" | "unavailable";
const MAX_PENDING_INTENTS = 32;
const MAX_SEND_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = 350;

function randomHex(length: number) {
  let value = "";
  while (value.length < length) value += Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, "0");
  return value.slice(0, length);
}

function socketOrigin() {
  try {
    const baseUrl = resolveApiConfig().baseUrl;
    if (!baseUrl) return null;
    return baseUrl.replace(/\/api\/?$/i, "").replace(/\/+$/, "");
  } catch {
    return null;
  }
}

export function createShotId() {
  return `${randomHex(8)}-${randomHex(4)}-4${randomHex(3)}-a${randomHex(3)}-${randomHex(12)}`;
}

export function useBattleSocket(
  session: { roomCode: string; sessionToken: string } | null,
  enabled = true,
) {
  const socketRef = useRef<Socket | null>(null);
  const pendingIntentsRef = useRef(new Map<string, NetworkShotIntent>());
  const emittingIntentsRef = useRef(new Set<string>());
  const sendAttemptsRef = useRef(new Map<string, number>());
  const retryTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const sessionIdentityRef = useRef<string | null>(null);
  const [status, setStatus] = useState<BattleSocketStatus>("idle");
  const [lastHit, setLastHit] = useState<NetworkHitConfirmed | null>(null);
  const [lastAck, setLastAck] = useState<NetworkShotAck | null>(null);
  const [ackEvents, setAckEvents] = useState<NetworkShotAck[]>([]);
  const [lastRoomState, setLastRoomState] = useState<NetworkRoomState | null>(null);

  useEffect(() => {
    const identity = session ? `${session.roomCode}:${session.sessionToken}` : null;
    if (identity !== sessionIdentityRef.current) {
      pendingIntentsRef.current.clear();
      emittingIntentsRef.current.clear();
      for (const timer of retryTimersRef.current.values()) clearTimeout(timer);
      retryTimersRef.current.clear();
      sendAttemptsRef.current.clear();
      sessionIdentityRef.current = identity;
    }
    const origin = socketOrigin();
    if (!session || !enabled || !origin) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setLastHit(null);
      setLastAck(null);
      setAckEvents([]);
      setLastRoomState(null);
      setStatus("idle");
      return;
    }

    setStatus("connecting");
    const socket = io(origin, {
      transports: ["websocket", "polling"],
      path: "/api/socket.io",
      auth: {
        roomCode: session.roomCode,
        sessionToken: session.sessionToken,
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      timeout: 7000,
    });
    socketRef.current = socket;
    const emitPending = () => {
      for (const intent of pendingIntentsRef.current.values()) {
        if (!emittingIntentsRef.current.has(intent.shotId)) emitIntent(socket, intent);
      }
    };
    const onConnect = () => {
      setStatus("connected");
      emitPending();
    };
    const onDisconnect = () => setStatus("unavailable");
    const onConnectError = () => setStatus("unavailable");
    const onHit = (event: NetworkHitConfirmed) => setLastHit(event);
    const onRoomState = (event: NetworkRoomState) => setLastRoomState(event);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("battle:hit-confirmed", onHit);
    socket.on("battle:state", onRoomState);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("battle:hit-confirmed", onHit);
      socket.off("battle:state", onRoomState);
      socket.disconnect();
      emittingIntentsRef.current.clear();
      for (const timer of retryTimersRef.current.values()) clearTimeout(timer);
      retryTimersRef.current.clear();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [enabled, session?.roomCode, session?.sessionToken]);

  const emitIntent = useCallback((socket: Socket, intent: NetworkShotIntent) => {
    if (emittingIntentsRef.current.has(intent.shotId)) return;
    emittingIntentsRef.current.add(intent.shotId);
    sendAttemptsRef.current.set(intent.shotId, (sendAttemptsRef.current.get(intent.shotId) ?? 0) + 1);
    socket.timeout(7000).emit("battle:shot-intent", intent, (error: Error | null, result: NetworkShotAck) => {
      if (error) {
        emittingIntentsRef.current.delete(intent.shotId);
        const attempts = sendAttemptsRef.current.get(intent.shotId) ?? 1;
        if (pendingIntentsRef.current.has(intent.shotId) && attempts < MAX_SEND_ATTEMPTS) {
          const retryDelay = nextShotRetryDelay(attempts, MAX_SEND_ATTEMPTS, RETRY_BACKOFF_MS);
          const timer = retryDelay === null ? undefined : setTimeout(() => {
            retryTimersRef.current.delete(intent.shotId);
            if (pendingIntentsRef.current.has(intent.shotId) && socket.connected && !emittingIntentsRef.current.has(intent.shotId)) {
              emitIntent(socket, intent);
            }
          }, retryDelay);
          if (timer) retryTimersRef.current.set(intent.shotId, timer);
        } else if (pendingIntentsRef.current.has(intent.shotId)) {
          pendingIntentsRef.current.delete(intent.shotId);
          sendAttemptsRef.current.delete(intent.shotId);
          setLastAck({ shotId: intent.shotId, reason: "SHOT_UNKNOWN" });
          setAckEvents((previous) => [...previous.slice(-31), { shotId: intent.shotId, reason: "SHOT_UNKNOWN" }]);
        }
        return;
      }
      emittingIntentsRef.current.delete(intent.shotId);
      const timer = retryTimersRef.current.get(intent.shotId);
      if (timer) clearTimeout(timer);
      retryTimersRef.current.delete(intent.shotId);
      sendAttemptsRef.current.delete(intent.shotId);
      pendingIntentsRef.current.delete(intent.shotId);
      const ack = result ?? { shotId: intent.shotId, reason: "SHOT_REJECTED", accepted: false };
      setLastAck(ack);
      setAckEvents((previous) => [...previous.slice(-31), ack]);
    });
  }, []);

  const sendShotIntent = useCallback((intent: NetworkShotIntent) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return false;
    if (pendingIntentsRef.current.size >= MAX_PENDING_INTENTS) return false;
    sendAttemptsRef.current.delete(intent.shotId);
    pendingIntentsRef.current.set(intent.shotId, intent);
    emitIntent(socket, intent);
    return true;
  }, [emitIntent]);

  return {
    status,
    connected: status === "connected",
    lastHit,
    lastAck,
    ackEvents,
    lastRoomState,
    sendShotIntent,
  };
}