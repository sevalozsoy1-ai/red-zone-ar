import { io, type Socket } from "socket.io-client";
import { useCallback, useEffect, useRef, useState } from "react";
import { resolveApiConfig } from "@/lib/api-config";

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

export type BattleSocketStatus = "idle" | "connecting" | "connected" | "unavailable";

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
  const [status, setStatus] = useState<BattleSocketStatus>("idle");
  const [lastHit, setLastHit] = useState<NetworkHitConfirmed | null>(null);
  const [lastAck, setLastAck] = useState<NetworkShotAck | null>(null);

  useEffect(() => {
    const origin = socketOrigin();
    if (!session || !enabled || !origin) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      pendingIntentsRef.current.clear();
      setLastHit(null);
      setLastAck(null);
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
      for (const intent of pendingIntentsRef.current.values()) emitIntent(socket, intent);
    };
    const onConnect = () => {
      setStatus("connected");
      emitPending();
    };
    const onDisconnect = () => setStatus("unavailable");
    const onConnectError = () => setStatus("unavailable");
    const onHit = (event: NetworkHitConfirmed) => setLastHit(event);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("battle:hit-confirmed", onHit);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("battle:hit-confirmed", onHit);
      socket.disconnect();
      pendingIntentsRef.current.clear();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [enabled, session?.roomCode, session?.sessionToken]);

  const emitIntent = useCallback((socket: Socket, intent: NetworkShotIntent) => {
    socket.timeout(7000).emit("battle:shot-intent", intent, (error: Error | null, result: NetworkShotAck) => {
      if (error) {
        setLastAck({ shotId: intent.shotId, reason: "SHOT_TIMEOUT", accepted: false });
        return;
      }
      pendingIntentsRef.current.delete(intent.shotId);
      setLastAck(result ?? { shotId: intent.shotId, reason: "SHOT_REJECTED", accepted: false });
    });
  }, []);

  const sendShotIntent = useCallback((intent: NetworkShotIntent) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return false;
    pendingIntentsRef.current.set(intent.shotId, intent);
    emitIntent(socket, intent);
    return true;
  }, [emitIntent]);

  return {
    status,
    connected: status === "connected",
    lastHit,
    lastAck,
    sendShotIntent,
  };
}