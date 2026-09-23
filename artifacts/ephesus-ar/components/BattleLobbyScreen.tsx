import { Feather } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import {
  getHealthCheckQueryKey,
  type BattleSession,
  useCreateBattleRoom,
  useGetBattleState,
  useHealthCheck,
  useJoinBattleRoom,
  useLeaveBattleRoom,
  useStartBattleRoom,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, AppState, BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { uiText } from "@/lib/i18n";
import { rtlLayout } from "@/lib/rtl";
import { isGoneBattleSession } from "@/lib/battle-ui";
import { retryBattleEntry } from "@/lib/battle-entry-retry";
import { setBattleSessionToken } from "@/lib/battle-auth";
import { battleSessionCopy } from "@/lib/battle-session-copy";
import { handleBattleAppStateChange, handleBattleHardwareBack } from "@/lib/battle-session-lifecycle";
import EconomyGate from "./EconomyGate";

function formatLobbyError(error: unknown, t: (key: any) => string) {
  const payload =
    error && typeof error === "object" && "data" in error
      ? (error as { data?: unknown }).data
      : undefined;
  const serverCode =
    payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
      ? payload.error
      : undefined;
  if (serverCode) return `${t("errorMessage")} · ${serverCode}`;

  const rawMessage = error instanceof Error ? error.message : "";
  if (/API_CONNECTION|Network request failed|Failed to fetch|fetch failed|timed out/i.test(rawMessage)) {
    return `${t("errorMessage")} · ${t("cameraHint")}`;
  }
  if (/^HTTP \d+/.test(rawMessage)) return `${t("errorMessage")} · ${t("tryAgain")}`;
  return `${t("errorMessage")} · ${t("tryAgain")}`;
}

/*
export default function BattleLobbyScreen({ onBack, onStart }: { onBack: () => void; onStart: (session: BattleSession) => void }) {
  const colors = useColors();
  const { locale, t, rtl } = useI18n();
  const insets = useSafeAreaInsets();
  const safeTop = Math.max(insets.top, Platform.OS === "web" ? 48 : 0);
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [session, setSession] = useState<BattleSession | null>(null);
  const [message, setMessage] = useState("");
  const [leaveError, setLeaveError] = useState("");
  const [entryIntent, setEntryIntent] = useState<"create" | "join" | null>(null);
  const [entryMatchId, setEntryMatchId] = useState<string | undefined>();
  const [entryDraft, setEntryDraft] = useState<{ name: string; code?: string; requestId: string } | null>(null);
  const stateParams = { code: session?.room.code ?? "000000" };
  const authRequest = session?.sessionToken
    ? { headers: { Authorization: `Bearer ${session.sessionToken}` } }
    : undefined;
  const healthQuery = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), retry: 1, staleTime: 30_000 } });
  const roomQuery = useGetBattleState(stateParams, {
    request: authRequest,
    query: { queryKey: getGetBattleStateQueryKey(stateParams), enabled: !!session, refetchInterval: 700, refetchIntervalInBackground: false },
  });
  const room = roomQuery.data?.room ?? session?.room;
  const ownPlayer = room?.players.find((player) => player.id === session?.playerId);

  useEffect(() => {
    if (session && isGoneBattleSession(roomQuery.error)) {
      setBattleSessionToken(null);
      onBack();
    }
  }, [onBack, roomQuery.error, session]);

  useEffect(() => {
    if (room?.status === "active" && session) onStart({ playerId: session.playerId, sessionToken: session.sessionToken, room });
  }, [onStart, room, session]);

  const accept = (next: BattleSession) => {
    setBattleSessionToken(next.sessionToken);
    queryClient.setQueryData(getGetBattleStateQueryKey({ code: next.room.code }), next);
    setMessage("");
    if (next.room.status === "active") {
      onStart(next);
      return;
    }
    setSession(next);
  };
  const reject = (error: unknown) => setMessage(formatLobbyError(error, t));
  const create = useCreateBattleRoom({ mutation: { onSuccess: accept, onError: reject } });
  const join = useJoinBattleRoom({ mutation: { onSuccess: accept, onError: reject } });
  const start = useStartBattleRoom({ request: authRequest, mutation: { onSuccess: accept, onError: reject } });
  const leave = useLeaveBattleRoom({ request: authRequest });
  const heartbeat = useHeartbeatBattleRoom({
    request: authRequest,
    mutation: { onError: (error) => setMessage(formatLobbyError(error, t)) },
  });
  const heartbeatRef = useRef(heartbeat);
  heartbeatRef.current = heartbeat;
  const busy = create.isPending || join.isPending || start.isPending || leave.isPending;
  const roomError = roomQuery.isError ? formatLobbyError(roomQuery.error, t) : "";

  const handleBack = () => {
    if (leave.isPending) return;
    if (!session) {
      setBattleSessionToken(null);
      onBack();
      return;
    }
    setLeaveError("");
    leave.mutate(
      { code: session.room.code },
      {
        onSuccess: () => {
          setBattleSessionToken(null);
          onBack();
        },
        onError: (error) => {
          if (isGoneBattleSession(error)) {
            setBattleSessionToken(null);
            onBack();
            return;
          }
          setLeaveError(formatLobbyError(error, t));
        },
      },
    );
  };

  useEffect(() => {
    if (!session) return;
    const beat = () => {
      // AppState interruptions deliberately pause lease renewals without
      // sending a leave request. The server grace window handles brief
      // camera/OS interruptions, and this heartbeat reconnects on resume.
      if (AppState.currentState === "active" && !heartbeatRef.current.isPending) {
        heartbeatRef.current.mutate({ code: session.room.code });
      }
    };
    beat();
    const interval = setInterval(beat, 5_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") beat();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [session?.room.code, session?.sessionToken]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      handleBack();
      return true;
    });
    return () => subscription.remove();
  }, [handleBack]);

  const handleCreate = () => {
    const playerName = name.trim();
    setMessage("");
    if (!playerName) {
      setMessage(t("errorMessage"));
      return;
    }
    setEntryDraft({
      name: playerName,
      requestId: `create-${Crypto.randomUUID()}`,
    });
    setEntryMatchId(`create-${Date.now()}`);
    setEntryIntent("create");
  };

  const handleJoin = () => {
    const playerName = name.trim();
    const roomCode = code.trim().toUpperCase();
    setMessage("");
    if (!playerName) {
      setMessage(t("errorMessage"));
      return;
    }
    if (roomCode.length !== 6) {
      setMessage(t("errorMessage"));
      return;
    }
    setEntryDraft({
      name: playerName,
      code: roomCode,
      requestId: `join-${Crypto.randomUUID()}`,
    });
    // A room code is stable for the lifetime of this match and prevents a
    // retry from reserving a second team-entry charge.
    setEntryMatchId(roomCode);
    setEntryIntent("join");
  };

  if (session && room && ownPlayer) {
    return (
      <View style={[styles.root, rtl && styles.rtl, { backgroundColor: colors.background, paddingTop: safeTop + 10 }]}>
        <View style={styles.header}>
           <Pressable testID="leave-room-btn" disabled={leave.isPending} onPress={handleBack} style={[styles.icon, { borderColor: colors.border }, leave.isPending && styles.disabled]}><Feather name="x" color={colors.foreground} size={21} /></Pressable>
          <View style={styles.codeWrap}><Text style={[styles.label, { color: colors.mutedForeground }]}>{uiText(locale, "roomCode")}</Text><Text selectable style={[styles.code, { color: colors.cyan }]}>{room.code}</Text></View>
          <Text style={[styles.count, { color: colors.foreground }]}>{room.players.length}/{room.maxPlayers}</Text>
        </View>
        <ScrollView contentContainerStyle={[styles.lobbyContent, { paddingBottom: insets.bottom + 50 }]}>
            <View style={[styles.connectionCard, { backgroundColor: colors.card, borderColor: colors.cyan }]}>
              <Text style={[styles.connectionText, { color: colors.foreground }]}>
                {locale === "tr" ? "10 oyuncuya kadar flaş beacon savaşı" : "Flash beacon battle for up to 10 players"}
              </Text>
              <Text style={[styles.helper, { color: colors.mutedForeground }]}>
                {locale === "tr"
                  ? "Savaşta yalnızca arka kamera ve arka flaş kullanılır. Telefonunuzu rakibe doğrultun ve rakibin flaşını nişangâhın merkezinde tutun. Kırmızı nişangâh yalnızca kod doğrulanınca görünür. Kamera ve flaş izni zorunludur; ekran işareti veya çıkartma gerekmez."
                  : "Battle uses only the rear camera and rear torch. Aim at an opponent and hold their flash in the center crosshair. The reticle turns red only after the code is verified. Camera and torch permissions are required; no screen marker or sticker is needed."}
              </Text>
            </View>
          {roomError ? (
            <View style={[styles.connectionCard, { borderColor: colors.signal, backgroundColor: colors.card }]}>
              <Text style={[styles.connectionText, { color: colors.signal }]}>{roomError}</Text>
              <Pressable testID="retry-room-btn" onPress={() => roomQuery.refetch()} style={[styles.retryButton, { borderColor: colors.signal }]}>
                 <Text style={[styles.retryText, { color: colors.signal }]}>{t("tryAgain")}</Text>
              </Pressable>
            </View>
          ) : null}
          <View style={[styles.teamCard, { borderColor: colors.cyan, backgroundColor: colors.card }]}>
              <Text style={[styles.teamTitle, { color: colors.cyan }]}>{t("players")}</Text>
              {room.players.map((player) => (
                <View key={player.id} style={styles.playerRow}>
                  <Text style={[styles.playerName, { color: colors.foreground }]}>{player.name}{player.id === session.playerId ? ` (${t("ready")})` : ""}</Text>
                  {player.isHost && <Feather name="star" size={16} color={colors.amber} />}
                  <Text style={[styles.lives, { color: colors.mutedForeground }]}>♥ {player.lives}</Text>
                </View>
              ))}
          </View>
           <Text style={[styles.helper, { color: colors.mutedForeground, textAlign: "center" }]}>{room.players.length < 2 ? `${t("waiting")} · ${room.players.length}/2 ${t("players")}` : uiText(locale, "startRequirements")}</Text>
          {message ? <Text style={[styles.error, { color: colors.signal }]}>{message}</Text> : null}
           {leaveError ? (
             <View style={[styles.connectionCard, { borderColor: colors.signal, backgroundColor: colors.card }]}>
               <Text style={[styles.connectionText, { color: colors.signal }]} testID="leave-room-error">{leaveError}</Text>
               <Pressable testID="retry-leave-room-btn" disabled={leave.isPending} onPress={handleBack} style={[styles.retryButton, { borderColor: colors.signal }, leave.isPending && styles.disabled]}>
                 <Text style={[styles.retryText, { color: colors.signal }]}>{t("tryAgain")}</Text>
               </Pressable>
             </View>
           ) : null}
          {ownPlayer.isHost ? (
            <Pressable testID="start-deathmatch-btn" disabled={busy} onPress={() => start.mutate({ code: room.code })} style={[styles.primary, { backgroundColor: colors.cyan }, busy && styles.disabled]}>
               {busy ? <ActivityIndicator color={colors.ink} /> : <><Text style={[styles.primaryText, { color: colors.ink }]}>{t("teamBattle")}</Text><Feather name="play" size={20} color={colors.ink} /></>}
           </Pressable>
            ) : <View style={[styles.waiting, { borderColor: colors.border }]}><ActivityIndicator color={colors.cyan} /><Text style={[styles.helper, { color: colors.mutedForeground }]}>{uiText(locale, "waitingHost")}</Text></View>}
         </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, rtl && styles.rtl, { backgroundColor: colors.background, paddingTop: safeTop + 10 }]}>
      <View style={styles.header}><Pressable onPress={handleBack} style={[styles.icon, { borderColor: colors.border }]}><Feather name="chevron-left" color={colors.foreground} size={23} /></Pressable><Text style={[styles.title, { color: colors.foreground }]}>{t("teamBattle")}</Text><View style={styles.icon} /></View>
      <KeyboardAwareScrollViewCompat keyboardShouldPersistTaps="handled" style={styles.formScroll} contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 50 }]}>
        <Text style={[styles.hero, { color: colors.foreground }]}>{t("players")}{`\n`}{t("teamBattle")}</Text>
        <Text style={[styles.helper, { color: colors.mutedForeground }]}>{uiText(locale, "startRequirements")}</Text>
        {healthQuery.isError ? (
          <View style={[styles.connectionCard, { borderColor: colors.signal, backgroundColor: colors.card }]}>
            <Text style={[styles.connectionText, { color: colors.signal }]}>{formatLobbyError(healthQuery.error, t)}</Text>
            <Pressable testID="retry-api-btn" onPress={() => healthQuery.refetch()} style={[styles.retryButton, { borderColor: colors.signal }]}>
              <Text style={[styles.retryText, { color: colors.signal }]}>{t("tryAgain")}</Text>
            </Pressable>
          </View>
        ) : null}
        {healthQuery.isFetching && !healthQuery.isError ? <Text style={[styles.connectionHint, { color: colors.mutedForeground }]}>{uiText(locale, "serverChecking")}</Text> : null}
        <TextInput testID="player-name-input" value={name} onChangeText={(value) => { setName(value); setMessage(""); }} maxLength={18} placeholder={uiText(locale, "playerName")} placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]} />
        <Text style={[styles.sectionTitle, { color: colors.cyan }]}>{uiText(locale, "createRoom")}</Text>
        <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>{uiText(locale, "roomCreateHint")}</Text>
        <Pressable testID="create-room-btn" disabled={busy || !name.trim()} onPress={handleCreate} style={[styles.primary, { backgroundColor: colors.cyan }, (!name.trim() || busy) && styles.disabled]}>
          {create.isPending ? <ActivityIndicator color={colors.ink} /> : <><Text style={[styles.primaryText, { color: colors.ink }]}>{uiText(locale, "createRoom")}</Text><Feather name="plus" size={20} color={colors.ink} /></>}
        </Pressable>
        <View style={styles.or}><View style={[styles.line, { backgroundColor: colors.border }]} /><Text style={[styles.label, { color: colors.mutedForeground }]}>{t("continue")}</Text><View style={[styles.line, { backgroundColor: colors.border }]} /></View>
         <Text style={[styles.sectionTitle, { color: colors.cyan }]}>{uiText(locale, "joinRoom")}</Text>
         <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>{uiText(locale, "roomJoinHint")}</Text>
        <TextInput testID="room-code-input" value={code} onChangeText={(value) => { setCode(value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()); setMessage(""); }} maxLength={6} autoCapitalize="characters" autoCorrect={false} placeholder={uiText(locale, "roomCode")} placeholderTextColor={colors.mutedForeground} style={[styles.input, styles.codeInput, { color: colors.cyan, borderColor: colors.border, backgroundColor: colors.card }]} />
        <Pressable testID="join-room-btn" disabled={busy || !name.trim() || code.length !== 6} onPress={handleJoin} style={[styles.secondary, { borderColor: colors.cyan }, (busy || !name.trim() || code.length !== 6) && styles.disabled]}>
          {join.isPending ? <ActivityIndicator color={colors.cyan} /> : <Text style={[styles.primaryText, { color: colors.cyan }]}>{uiText(locale, "joinRoom")}</Text>}
        </Pressable>
        {message ? <Text style={[styles.error, { color: colors.signal }]}>{message}</Text> : null}
      </KeyboardAwareScrollViewCompat>
      <EconomyGate
        visible={!!entryIntent && !!entryDraft}
        action="teamEntry"
        matchId={entryMatchId}
        title={t("teamBattle")}
        body={uiText(locale, "startRequirements")}
        onApproved={async () => {
          if (!entryIntent || !entryDraft) return false;
          try {
            if (entryIntent === "create") {
              await create.mutateAsync({ data: { name: entryDraft.name } });
            } else {
              await join.mutateAsync({ code: entryDraft.code ?? "", data: { name: entryDraft.name } });
            }
            return true;
          } catch (error) {
            reject(error);
            return false;
          }
        }}
        onComplete={() => {
          setEntryIntent(null);
          setEntryDraft(null);
          setEntryMatchId(undefined);
        }}
        onCancel={() => {
          setEntryIntent(null);
          setEntryDraft(null);
          setEntryMatchId(undefined);
        }}
        testID="team-entry-gate"
      />
    </View>
  );
}
*/
export default function BattleLobbyScreen({
  onBack,
  onStart,
  onSessionExpired,
}: {
  onBack: () => void;
  onStart: (session: BattleSession) => void;
  onSessionExpired?: () => void;
}) {
  const colors = useColors();
  const { locale, t, rtl } = useI18n();
  const insets = useSafeAreaInsets();
  const safeTop = Math.max(insets.top, Platform.OS === "web" ? 48 : 0);
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [session, setSession] = useState<BattleSession | null>(null);
  const [message, setMessage] = useState("");
  const [leaveError, setLeaveError] = useState("");
  const [entryIntent, setEntryIntent] = useState<"create" | "join" | null>(null);
  const [entryMatchId, setEntryMatchId] = useState<string | undefined>();
  const [entryDraft, setEntryDraft] = useState<{ name: string; code?: string; requestId: string } | null>(null);
  const [entryRetryStatus, setEntryRetryStatus] = useState("");
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  const [sessionExpired, setSessionExpired] = useState(false);
  const appActiveRef = useRef(appActive);
  const sessionExpiredRef = useRef(false);
  const startTransitionRef = useRef(false);
  const entryInFlightRef = useRef(false);
  const entryGenerationRef = useRef(0);
  const mountedRef = useRef(true);
  appActiveRef.current = appActive;
  useEffect(() => () => {
    mountedRef.current = false;
    entryGenerationRef.current += 1;
  }, []);
  // The bearer belongs only in the Authorization header. Keep the cache
  // segregated by session without giving the URL builder a token field.
  const stateParams = { code: session?.room.code ?? "000000" };
  const roomQueryKey = ["/api/battle/state", stateParams.code, session?.sessionToken ?? "inactive-session-token"] as const;
  const authRequest = session?.sessionToken
    ? { headers: { Authorization: `Bearer ${session.sessionToken}` } }
    : undefined;
  const healthQuery = useHealthCheck({
    query: {
      queryKey: getHealthCheckQueryKey(),
      retry: 5,
      retryDelay: (attemptIndex) => Math.min(1_000 * 2 ** attemptIndex, 8_000),
      staleTime: 30_000,
      refetchOnReconnect: true,
    },
  });
  const roomQuery = useGetBattleState(stateParams as Parameters<typeof useGetBattleState>[0], {
    request: authRequest,
    query: {
      queryKey: roomQueryKey,
      enabled: !!session && appActive && !sessionExpired,
      refetchInterval: appActive && !sessionExpired ? 700 : false,
      refetchOnWindowFocus: true,
    },
  });
  const room = roomQuery.data?.room ?? session?.room;
  const ownPlayer = room?.players.find((player) => player.id === session?.playerId);

  const handleSessionExpired = useCallback(() => {
    if (sessionExpiredRef.current) return;
    sessionExpiredRef.current = true;
    setSessionExpired(true);
    const expiredSession = session;
    if (expiredSession) {
      queryClient.removeQueries({
        queryKey: ["/api/battle/state", expiredSession.room.code, expiredSession.sessionToken],
        exact: true,
      });
    }
    setBattleSessionToken(null);
    setSession(null);
    onSessionExpired?.();
    const copy = battleSessionCopy(locale);
    Alert.alert(copy.expiredTitle, copy.expiredMessage, [{
      text: t("continue"),
      onPress: onBack,
    }], { cancelable: false });
  }, [locale, onBack, onSessionExpired, queryClient, session, t]);

  useEffect(() => {
    if (!session || sessionExpired || !isGoneBattleSession(roomQuery.error)) return;
    handleSessionExpired();
  }, [handleSessionExpired, roomQuery.error, session, sessionExpired]);

  useEffect(() => {
    if (!appActive || sessionExpired || startTransitionRef.current || room?.status !== "active" || !session) return;
    startTransitionRef.current = true;
    onStart({ playerId: session.playerId, sessionToken: session.sessionToken, room });
  }, [appActive, onStart, room, session, sessionExpired]);

  const accept = (next: BattleSession) => {
    entryInFlightRef.current = false;
    setEntryRetryStatus("");
    sessionExpiredRef.current = false;
    setSessionExpired(false);
    startTransitionRef.current = false;
    setBattleSessionToken(next.sessionToken);
    setSession(next);
    queryClient.setQueryData(["/api/battle/state", next.room.code, next.sessionToken], next);
    setMessage("");
  };
  const reject = (error: unknown) => {
    // The retry wrapper owns transient mutation errors. React Query invokes
    // this callback for every failed attempt, so do not unlock the form or
    // replace the retry status until the wrapper gives up.
    if (entryInFlightRef.current) return;
    entryInFlightRef.current = false;
    setEntryRetryStatus("");
    if (session && isGoneBattleSession(error)) {
      handleSessionExpired();
      return;
    }
    setMessage(formatLobbyError(error, t));
  };
  const create = useCreateBattleRoom();
  const join = useJoinBattleRoom();
  const start = useStartBattleRoom({ request: authRequest, mutation: { onSuccess: accept, onError: reject } });
  const leave = useLeaveBattleRoom({ request: authRequest });
  const busy = create.isPending || join.isPending || start.isPending || leave.isPending;
  const roomError = roomQuery.isError ? formatLobbyError(roomQuery.error, t) : "";

  const handleBack = useCallback(() => {
    if (!appActiveRef.current) return;
    if (leave.isPending) return;
    if (!session) {
      setBattleSessionToken(null);
      onBack();
      return;
    }
    setLeaveError("");
    leave.mutate(
      { code: session.room.code } as Parameters<typeof leave.mutate>[0],
      {
        onSuccess: () => {
          setBattleSessionToken(null);
          onBack();
        },
        onError: (error) => {
          if (isGoneBattleSession(error)) {
            setBattleSessionToken(null);
            onBack();
            return;
          }
          setLeaveError(formatLobbyError(error, t));
        },
      },
    );
  }, [leave, onBack, session, t]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      handleBattleAppStateChange(nextState, {
        hasSession: !!session && !sessionExpired,
        queryKey: roomQueryKey,
        setAppActive: (nextActive) => {
          appActiveRef.current = nextActive;
          setAppActive(nextActive);
        },
        cancelQueries: (filters) => queryClient.cancelQueries(filters),
        refetch: roomQuery.refetch,
        isExpiredError: isGoneBattleSession,
        onExpired: handleSessionExpired,
      });
    });
    return () => subscription.remove();
  }, [handleSessionExpired, queryClient, roomQuery.refetch, session?.room.code, session?.sessionToken, sessionExpired]);

  const requestHardwareBack = useCallback(() => {
    const copy = battleSessionCopy(locale);
    return handleBattleHardwareBack({
      hasSession: !!session,
      sessionExpired,
      leavePending: leave.isPending,
      onExit: onBack,
      onLeave: handleBack,
      confirmLeave: ({ onConfirm, onCancel }) => Alert.alert(copy.leaveTitle, copy.leaveMessage, [
        { text: copy.leaveCancel, style: "cancel", onPress: onCancel },
        { text: copy.leaveConfirm, style: "destructive", onPress: onConfirm },
      ], { cancelable: true }),
    });
  }, [handleBack, leave.isPending, locale, onBack, session, sessionExpired]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", requestHardwareBack);
    return () => subscription.remove();
  }, [requestHardwareBack]);

  const handleCreate = async () => {
    if (!appActiveRef.current) return;
    if (entryInFlightRef.current) return;
    entryGenerationRef.current += 1;
    const playerName = name.trim();
    setMessage("");
    setEntryRetryStatus("");
    if (!playerName) {
      setMessage(t("errorMessage"));
      return;
    }
    setEntryDraft({
      name: playerName,
      requestId: `create-${Crypto.randomUUID()}`,
    });
    setEntryMatchId(`create-${Date.now()}`);
    setEntryIntent("create");
  };

  const handleJoin = async () => {
    if (!appActiveRef.current) return;
    if (entryInFlightRef.current) return;
    entryGenerationRef.current += 1;
    const playerName = name.trim();
    const roomCode = code.trim().toUpperCase();
    setMessage("");
    setEntryRetryStatus("");
    if (!playerName) {
      setMessage(t("errorMessage"));
      return;
    }
    if (roomCode.length !== 6) {
      setMessage(t("errorMessage"));
      return;
    }
    setEntryDraft({
      name: playerName,
      code: roomCode,
      requestId: `join-${Crypto.randomUUID()}`,
    });
    // A room code is stable for the lifetime of this match and prevents a
    // retry from reserving a second team-entry charge.
    setEntryMatchId(roomCode);
    setEntryIntent("join");
  };

  if (session && room && ownPlayer) {
    return (
      <View style={[styles.root, rtl && styles.rtl, { backgroundColor: colors.background, paddingTop: safeTop + 10 }]}>
        <View style={styles.header}>
           <Pressable testID="leave-room-btn" disabled={leave.isPending} onPress={handleBack} style={[styles.icon, { borderColor: colors.border }, leave.isPending && styles.disabled]}><Feather name="x" color={colors.foreground} size={21} /></Pressable>
          <View style={styles.codeWrap}><Text style={[styles.label, { color: colors.mutedForeground }]}>{uiText(locale, "roomCode")}</Text><Text selectable style={[styles.code, { color: colors.cyan }]}>{room.code}</Text></View>
          <Text style={[styles.count, { color: colors.foreground }]}>{room.players.length}/{room.maxPlayers}</Text>
        </View>
        <ScrollView contentContainerStyle={[styles.lobbyContent, { paddingBottom: insets.bottom + 50 }]}>
            <View style={[styles.connectionCard, { backgroundColor: colors.card, borderColor: colors.cyan }]}>
              <Text style={[styles.connectionText, { color: colors.foreground }]}>
                {locale === "tr" ? "10 oyuncuya kadar flaş beacon savaşı" : "Flash beacon battle for up to 10 players"}
              </Text>
              <Text style={[styles.helper, { color: colors.mutedForeground }]}>
                {locale === "tr"
                  ? "Savaşta yalnızca arka kamera ve arka flaş kullanılır. Telefonunuzu rakibe doğrultun; rakibin flaşını nişangâhın merkezinde tutun. Kırmızı nişangâh yalnızca rakibin kodu doğrulandığında görünür. Kamera ve flaş izni zorunludur; ekran işareti veya çıkartma gerekmez."
                  : "Battle uses the rear camera and rear torch only. Aim your phone at an opponent and hold their flash in the crosshair center. The reticle turns red only after the opponent code is verified. Camera and torch permission are required; no screen marker or sticker is needed."}
              </Text>
            </View>
           <View style={[styles.connectionCard, { borderColor: colors.cyan, backgroundColor: colors.card }]}>
             <Text style={[styles.connectionText, { color: colors.foreground }]}>{uiText(locale, "networkContinuity")}</Text>
             <Text style={[styles.helper, { color: colors.mutedForeground }]}>{uiText(locale, "hitTolerance")}</Text>
           </View>
          {roomError ? (
            <View style={[styles.connectionCard, { borderColor: colors.signal, backgroundColor: colors.card }]}>
              <Text style={[styles.connectionText, { color: colors.signal }]}>{roomError}</Text>
              <Pressable testID="retry-room-btn" disabled={!appActive} onPress={() => roomQuery.refetch()} style={[styles.retryButton, { borderColor: colors.signal }, !appActive && styles.disabled]}>
                 <Text style={[styles.retryText, { color: colors.signal }]}>{t("tryAgain")}</Text>
              </Pressable>
            </View>
          ) : null}
          <View style={[styles.teamCard, { borderColor: colors.cyan, backgroundColor: colors.card }]}>
              <Text style={[styles.teamTitle, { color: colors.cyan }]}>{t("players")}</Text>
              {room.players.map((player) => (
                <View key={player.id} style={styles.playerRow}>
                  <Text style={[styles.playerName, { color: colors.foreground }]}>{player.name}{player.id === session.playerId ? ` (${t("ready")})` : ""}</Text>
                  {player.isHost && <Feather name="star" size={16} color={colors.amber} />}
                  <Text style={[styles.lives, { color: colors.mutedForeground }]}>♥ {player.lives}</Text>
                </View>
              ))}
          </View>
           <Text style={[styles.helper, { color: colors.mutedForeground, textAlign: "center" }]}>{uiText(locale, "startRequirements")}</Text>
          {message ? <Text style={[styles.error, { color: colors.signal }]}>{message}</Text> : null}
           {leaveError ? (
             <View style={[styles.connectionCard, { borderColor: colors.signal, backgroundColor: colors.card }]}>
               <Text style={[styles.connectionText, { color: colors.signal }]} testID="leave-room-error">{leaveError}</Text>
               <Pressable testID="retry-leave-room-btn" disabled={leave.isPending} onPress={handleBack} style={[styles.retryButton, { borderColor: colors.signal }, leave.isPending && styles.disabled]}>
                 <Text style={[styles.retryText, { color: colors.signal }]}>{t("tryAgain")}</Text>
               </Pressable>
             </View>
           ) : null}
           {ownPlayer.isHost ? (
             <Pressable testID="start-battle-btn" disabled={busy || !appActive} onPress={() => {
              if (!appActiveRef.current) return;
              start.mutate({ code: room.code } as Parameters<typeof start.mutate>[0]);
            }} style={[styles.primary, { backgroundColor: colors.cyan }, (!appActive || busy) && styles.disabled]}>
               {busy ? <ActivityIndicator color={colors.ink} /> : <><Text style={[styles.primaryText, { color: colors.ink }]}>{t("teamBattle")}</Text><Feather name="play" size={20} color={colors.ink} /></>}
           </Pressable>
            ) : <View style={[styles.waiting, { borderColor: colors.border }]}><ActivityIndicator color={colors.cyan} /><Text style={[styles.helper, { color: colors.mutedForeground }]}>{uiText(locale, "waitingHost")}</Text></View>}
         </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, rtl && styles.rtl, { backgroundColor: colors.background, paddingTop: safeTop + 10 }]}>
      <View style={styles.header}><Pressable onPress={handleBack} style={[styles.icon, { borderColor: colors.border }]}><Feather name="chevron-left" color={colors.foreground} size={23} /></Pressable><Text style={[styles.title, { color: colors.foreground }]}>{t("teamBattle")}</Text><View style={styles.icon} /></View>
      <KeyboardAwareScrollViewCompat keyboardShouldPersistTaps="handled" style={styles.formScroll} contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 50 }]}>
        <Text style={[styles.hero, { color: colors.foreground }]}>{t("players")}{`\n`}{t("teamBattle")}</Text>
        <Text style={[styles.helper, { color: colors.mutedForeground }]}>{uiText(locale, "startRequirements")}</Text>
         <View style={[styles.connectionCard, { borderColor: colors.cyan, backgroundColor: colors.card }]}>
            <Text style={[styles.connectionText, { color: colors.foreground }]}>{uiText(locale, "battleConsent")}</Text>
         </View>
        {healthQuery.isError ? (
          <View style={[styles.connectionCard, { borderColor: colors.signal, backgroundColor: colors.card }]}>
            <Text style={[styles.connectionText, { color: colors.signal }]}>{formatLobbyError(healthQuery.error, t)}</Text>
            <Pressable testID="retry-api-btn" onPress={() => healthQuery.refetch()} style={[styles.retryButton, { borderColor: colors.signal }]}>
              <Text style={[styles.retryText, { color: colors.signal }]}>{t("tryAgain")}</Text>
            </Pressable>
          </View>
        ) : null}
        {healthQuery.isFetching && !healthQuery.isError ? <Text style={[styles.connectionHint, { color: colors.mutedForeground }]}>{uiText(locale, "serverChecking")}</Text> : null}
        {entryRetryStatus ? <Text testID="entry-retry-status" style={[styles.connectionHint, { color: colors.cyan }]}>{entryRetryStatus}</Text> : null}
         <TextInput testID="player-name-input" value={name} onChangeText={(value) => { setName(value); setMessage(""); }} maxLength={18} placeholder={uiText(locale, "playerName")} placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]} />
        <Text style={[styles.sectionTitle, { color: colors.cyan }]}>{uiText(locale, "createRoom")}</Text>
        <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>{uiText(locale, "roomCreateHint")}</Text>
         <Pressable testID="create-room-btn" disabled={busy || !name.trim()} onPress={handleCreate} style={[styles.primary, { backgroundColor: colors.cyan }, (!name.trim() || busy) && styles.disabled]}>
          {create.isPending ? <ActivityIndicator color={colors.ink} /> : <><Text style={[styles.primaryText, { color: colors.ink }]}>{uiText(locale, "createRoom")}</Text><Feather name="plus" size={20} color={colors.ink} /></>}
        </Pressable>
        <View style={styles.or}><View style={[styles.line, { backgroundColor: colors.border }]} /><Text style={[styles.label, { color: colors.mutedForeground }]}>{t("continue")}</Text><View style={[styles.line, { backgroundColor: colors.border }]} /></View>
        <Text style={[styles.sectionTitle, { color: colors.cyan }]}>{uiText(locale, "joinRoom")}</Text>
        <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>{uiText(locale, "roomJoinHint")}</Text>
        <TextInput testID="room-code-input" value={code} onChangeText={(value) => { setCode(value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()); setMessage(""); }} maxLength={6} autoCapitalize="characters" autoCorrect={false} placeholder={uiText(locale, "roomCode")} placeholderTextColor={colors.mutedForeground} style={[styles.input, styles.codeInput, { color: colors.cyan, borderColor: colors.border, backgroundColor: colors.card }]} />
         <Text style={[styles.helper, { color: colors.mutedForeground, textAlign: "center", marginTop: 8 }]}>{uiText(locale, "manualCodeFallback")}</Text>
         <Pressable testID="join-room-btn" disabled={busy || !name.trim() || code.length !== 6} onPress={handleJoin} style={[styles.secondary, { borderColor: colors.cyan }, (busy || !name.trim() || code.length !== 6) && styles.disabled]}>
          {join.isPending ? <ActivityIndicator color={colors.cyan} /> : <Text style={[styles.primaryText, { color: colors.cyan }]}>{uiText(locale, "joinRoom")}</Text>}
        </Pressable>
        {message ? <Text style={[styles.error, { color: colors.signal }]}>{message}</Text> : null}
      </KeyboardAwareScrollViewCompat>
      <EconomyGate
        visible={!!entryIntent && !!entryDraft}
        action="teamEntry"
        matchId={entryMatchId}
        title={t("teamBattle")}
        body={uiText(locale, "startRequirements")}
        onApproved={async () => {
          if (!entryIntent || !entryDraft) return false;
          if (entryInFlightRef.current) return false;
          const generation = entryGenerationRef.current + 1;
          entryGenerationRef.current = generation;
          entryInFlightRef.current = true;
          setEntryRetryStatus(`${t("waiting")}…`);
          try {
            const next = await retryBattleEntry(
              () => entryIntent === "create"
                ? create.mutateAsync({ data: { name: entryDraft.name, requestId: entryDraft.requestId } } as Parameters<typeof create.mutateAsync>[0])
                : join.mutateAsync({
                    code: entryDraft.code ?? "",
                    data: { name: entryDraft.name, requestId: entryDraft.requestId },
                  } as Parameters<typeof join.mutateAsync>[0]),
              {
                isCancelled: () => !mountedRef.current || entryGenerationRef.current !== generation,
                onRetry: (retryNumber, delayMs) => {
                  if (mountedRef.current && entryGenerationRef.current === generation) {
                    setEntryRetryStatus(`${t("tryAgain")} ${retryNumber}/2 · ${delayMs} ms`);
                  }
                },
              },
            );
            if (!mountedRef.current || entryGenerationRef.current !== generation) return false;
            accept(next);
            return true;
          } catch (error) {
            if (mountedRef.current && entryGenerationRef.current === generation
              && !(error instanceof Error && error.message === "BATTLE_ENTRY_CANCELLED")) {
              entryInFlightRef.current = false;
              reject(error);
            }
            return false;
          } finally {
            if (entryGenerationRef.current === generation) {
              entryInFlightRef.current = false;
              if (mountedRef.current) setEntryRetryStatus("");
            }
          }
        }}
        onComplete={() => {
          entryGenerationRef.current += 1;
          entryInFlightRef.current = false;
          setEntryRetryStatus("");
          setEntryIntent(null);
          setEntryDraft(null);
          setEntryMatchId(undefined);
        }}
        onCancel={() => {
          entryGenerationRef.current += 1;
          entryInFlightRef.current = false;
          setEntryRetryStatus("");
          setEntryIntent(null);
          setEntryDraft(null);
          setEntryMatchId(undefined);
        }}
        testID="team-entry-gate"
      />
    </View>
  );
}
/*
export default function BattleLobbyScreen({
  onBack,
  onStart,
  onSessionExpired,
}: {
  onBack: () => void;
  onStart: (session: BattleSession) => void;
  onSessionExpired?: () => void;
}) {
  const colors = useColors();
  const { locale, t, rtl } = useI18n();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [team, setTeam] = useState<Team>("red");
  const [session, setSession] = useState<BattleSession | null>(null);
  const [message, setMessage] = useState("");
  const [leaveError, setLeaveError] = useState("");
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  const [sessionExpired, setSessionExpired] = useState(false);
  const appActiveRef = useRef(appActive);
  const sessionExpiredRef = useRef(false);
  const startTransitionRef = useRef(false);
  appActiveRef.current = appActive;
  const stateParams = { code: session?.room.code ?? "000000", sessionToken: session?.sessionToken ?? "inactive-session-token" };
  const healthQuery = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), retry: 1, staleTime: 30_000 } });

  const handleSessionExpired = useCallback(() => {
    if (sessionExpiredRef.current) return;
    sessionExpiredRef.current = true;
    setSessionExpired(true);
    const expiredSession = session;
    if (expiredSession) {
      queryClient.removeQueries({
        queryKey: getGetBattleStateQueryKey({
          code: expiredSession.room.code,
          sessionToken: expiredSession.sessionToken,
        }),
        exact: true,
      });
    }
    setSession(null);
    onSessionExpired?.();
    const copy = battleSessionCopy(locale);
    Alert.alert(copy.expiredTitle, copy.expiredMessage, [{
      text: t("continue"),
      onPress: onBack,
    }], { cancelable: false });
  }, [locale, onBack, onSessionExpired, queryClient, session, t]);

  const roomQuery = useGetBattleState(stateParams, {
    query: {
      queryKey: getGetBattleStateQueryKey(stateParams),
      enabled: !!session && appActive && !sessionExpired,
      refetchInterval: appActive && !sessionExpired ? 700 : false,
      refetchOnWindowFocus: true,
    },
  });
  const room = roomQuery.data?.room ?? session?.room;
  const ownPlayer = room?.players.find((player) => player.id === session?.playerId);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      handleBattleAppStateChange(nextState, {
        hasSession: !!session && !sessionExpired,
        queryKey: getGetBattleStateQueryKey(stateParams),
        setAppActive: (nextActive) => {
          appActiveRef.current = nextActive;
          setAppActive(nextActive);
        },
        cancelQueries: (filters) => queryClient.cancelQueries(filters),
        refetch: roomQuery.refetch,
        isExpiredError: isGoneBattleSession,
        onExpired: handleSessionExpired,
      });
    });
    return () => subscription.remove();
  }, [handleSessionExpired, queryClient, roomQuery.refetch, session?.room.code, session?.sessionToken, sessionExpired]);

  useEffect(() => {
    if (!appActive || sessionExpired || startTransitionRef.current || room?.status !== "active" || !session) return;
    // Mark the handoff before invoking the parent. The lobby unmounts during
    // this callback, and guarding here prevents a late poll from attempting a
    // second handoff (or a compensating leave) during the transition.
    startTransitionRef.current = true;
    onStart({ playerId: session.playerId, sessionToken: session.sessionToken, room });
  }, [appActive, onStart, room, session, sessionExpired]);

  useEffect(() => {
    if (!session || sessionExpired || !isGoneBattleSession(roomQuery.error)) return;
    handleSessionExpired();
  }, [handleSessionExpired, roomQuery.error, session, sessionExpired]);

  const accept = (next: BattleSession) => {
    sessionExpiredRef.current = false;
    setSessionExpired(false);
    startTransitionRef.current = false;
    setSession(next);
    queryClient.setQueryData(getGetBattleStateQueryKey({ code: next.room.code, sessionToken: next.sessionToken }), next);
    setMessage("");
  };
  const reject = (error: unknown) => {
    if (session && isGoneBattleSession(error)) {
      handleSessionExpired();
      return;
    }
    setMessage(formatLobbyError(error, t));
  };
  const create = useCreateBattleRoom({ mutation: { onSuccess: accept, onError: reject } });
  const join = useJoinBattleRoom({ mutation: { onSuccess: accept, onError: reject } });
  const start = useStartBattleRoom({ mutation: { onSuccess: accept, onError: reject } });
  const leave = useLeaveBattleRoom();
  const busy = create.isPending || join.isPending || start.isPending || leave.isPending;
  const roomError = roomQuery.isError ? formatLobbyError(roomQuery.error, t) : "";

  const handleBack = useCallback(() => {
    if (!appActiveRef.current) return;
    if (!session || leave.isPending) {
      onBack();
      return;
    }
    setLeaveError("");
    leave.mutate(
      { code: session.room.code, data: { sessionToken: session.sessionToken } },
      {
        onSuccess: onBack,
        onError: (error) => {
          if (isGoneBattleSession(error)) {
            onBack();
            return;
          }
          setLeaveError(formatLobbyError(error, t));
        },
      },
    );
  }, [leave, onBack, session, t]);

  const requestHardwareBack = useCallback(() => {
    const copy = battleSessionCopy(locale);
    return handleBattleHardwareBack({
      hasSession: !!session,
      sessionExpired,
      leavePending: leave.isPending,
      onExit: onBack,
      onLeave: handleBack,
      confirmLeave: ({ onConfirm, onCancel }) => Alert.alert(copy.leaveTitle, copy.leaveMessage, [
        { text: copy.leaveCancel, style: "cancel", onPress: onCancel },
        { text: copy.leaveConfirm, style: "destructive", onPress: onConfirm },
      ], { cancelable: true }),
    });
  }, [handleBack, leave.isPending, locale, onBack, session, sessionExpired]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", requestHardwareBack);
    return () => subscription.remove();
  }, [requestHardwareBack]);

  const handleCreate = () => {
    if (!appActiveRef.current) return;
    const playerName = name.trim();
    setMessage("");
    if (!playerName) {
      setMessage(t("errorMessage"));
      return;
    }
    create.mutate({ data: { name: playerName, team } });
  };

  const handleJoin = () => {
    if (!appActiveRef.current) return;
    const playerName = name.trim();
    const roomCode = code.trim().toUpperCase();
    setMessage("");
    if (!playerName) {
      setMessage(t("errorMessage"));
      return;
    }
    if (roomCode.length !== 6) {
      setMessage(t("errorMessage"));
      return;
    }
    join.mutate({ code: roomCode, data: { name: playerName, team } });
  };

  if (session && room && ownPlayer) {
    return (
      <View style={[styles.root, rtl && styles.rtl, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}>
        <View style={styles.header}>
           <Pressable testID="leave-room-btn" disabled={leave.isPending} onPress={handleBack} style={[styles.icon, { borderColor: colors.border }, leave.isPending && styles.disabled]}><Feather name="x" color={colors.foreground} size={21} /></Pressable>
          <View style={styles.codeWrap}><Text style={[styles.label, { color: colors.mutedForeground }]}>{uiText(locale, "roomCode")}</Text><Text selectable style={[styles.code, { color: colors.cyan }]}>{room.code}</Text></View>
          <Text style={[styles.count, { color: colors.foreground }]}>{room.players.length}/{room.maxPlayers}</Text>
        </View>
        <ScrollView contentContainerStyle={[styles.lobbyContent, { paddingBottom: insets.bottom + 50 }]}>
            <View style={[styles.connectionCard, { backgroundColor: colors.card, borderColor: colors.cyan }]}>
              <Text style={[styles.connectionText, { color: colors.foreground }]}>
                {locale === "tr" ? "10 oyuncuya kadar flaş beacon savaşı" : "Flash beacon battle for up to 10 players"}
              </Text>
              <Text style={[styles.helper, { color: colors.mutedForeground }]}>
                {locale === "tr"
                  ? "Savaşta yalnızca arka kamera ve arka flaş kullanılır. Telefonunuzu rakibe doğrultun ve rakibin flaşını nişangâhın merkezinde tutun. Kırmızı nişangâh yalnızca kod doğrulanınca görünür. Kamera ve flaş izni zorunludur; ekran işareti veya çıkartma gerekmez."
                  : "Battle uses only the rear camera and rear torch. Aim at an opponent and hold their flash in the center crosshair. The reticle turns red only after the code is verified. Camera and torch permissions are required; no screen marker or sticker is needed."}
              </Text>
            </View>
          {roomError ? (
            <View style={[styles.connectionCard, { borderColor: colors.signal, backgroundColor: colors.card }]}>
              <Text style={[styles.connectionText, { color: colors.signal }]}>{roomError}</Text>
               <Pressable testID="retry-room-btn" disabled={!appActive} onPress={() => roomQuery.refetch()} style={[styles.retryButton, { borderColor: colors.signal }, !appActive && styles.disabled]}>
                 <Text style={[styles.retryText, { color: colors.signal }]}>{t("tryAgain")}</Text>
              </Pressable>
            </View>
          ) : null}
          {(["red", "blue"] as Team[]).map((teamName) => (
            <View key={teamName} style={[styles.teamCard, { borderColor: teamName === "red" ? colors.signal : colors.cyan, backgroundColor: colors.card }]}>
              <Text style={[styles.teamTitle, { color: teamName === "red" ? colors.signal : colors.cyan }]}>{teamName === "red" ? uiText(locale, "teamRed") : uiText(locale, "teamBlue")}</Text>
              {room.players.filter((player) => player.team === teamName).map((player) => (
                <View key={player.id} style={styles.playerRow}>
                  <Text style={[styles.playerName, { color: colors.foreground }]}>{player.name}{player.id === session.playerId ? ` (${t("ready")})` : ""}</Text>
                  {player.isHost && <Feather name="star" size={16} color={colors.amber} />}
                  <Text style={[styles.lives, { color: colors.mutedForeground }]}>♥ {player.lives}</Text>
                </View>
              ))}
            </View>
          ))}
           <Text style={[styles.helper, { color: colors.mutedForeground, textAlign: "center" }]}>{uiText(locale, "startRequirements")}</Text>
          {message ? <Text style={[styles.error, { color: colors.signal }]}>{message}</Text> : null}
           {leaveError ? (
             <View style={[styles.connectionCard, { borderColor: colors.signal, backgroundColor: colors.card }]}>
               <Text style={[styles.connectionText, { color: colors.signal }]} testID="leave-room-error">{leaveError}</Text>
               <Pressable testID="retry-leave-room-btn" disabled={leave.isPending} onPress={handleBack} style={[styles.retryButton, { borderColor: colors.signal }, leave.isPending && styles.disabled]}>
                 <Text style={[styles.retryText, { color: colors.signal }]}>{t("tryAgain")}</Text>
               </Pressable>
             </View>
           ) : null}
          {ownPlayer.isHost ? (
             <Pressable testID="start-team-battle-btn" disabled={busy || !appActive} onPress={() => {
               if (!appActiveRef.current) return;
               start.mutate({ code: room.code, data: { sessionToken: session.sessionToken } });
             }} style={[styles.primary, { backgroundColor: colors.cyan }, (!appActive || busy) && styles.disabled]}>
               {busy ? <ActivityIndicator color={colors.ink} /> : <><Text style={[styles.primaryText, { color: colors.ink }]}>{t("teamBattle")}</Text><Feather name="play" size={20} color={colors.ink} /></>}
           </Pressable>
           ) : <View style={[styles.waiting, { borderColor: colors.border }]}><ActivityIndicator color={colors.cyan} /><Text style={[styles.helper, { color: colors.mutedForeground }]}>{uiText(locale, "waitingHost")}</Text></View>}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, rtl && styles.rtl, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}>
      <View style={styles.header}><Pressable onPress={onBack} style={[styles.icon, { borderColor: colors.border }]}><Feather name="chevron-left" color={colors.foreground} size={23} /></Pressable><Text style={[styles.title, { color: colors.foreground }]}>{t("teamBattle")}</Text><View style={styles.icon} /></View>
      <KeyboardAwareScrollViewCompat keyboardShouldPersistTaps="handled" style={styles.formScroll} contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 50 }]}>
        <Text style={[styles.hero, { color: colors.foreground }]}>{t("players")}{`\n`}{t("teamBattle")}</Text>
        <Text style={[styles.helper, { color: colors.mutedForeground }]}>{uiText(locale, "startRequirements")}</Text>
        {healthQuery.isError ? (
          <View style={[styles.connectionCard, { borderColor: colors.signal, backgroundColor: colors.card }]}>
            <Text style={[styles.connectionText, { color: colors.signal }]}>{formatLobbyError(healthQuery.error, t)}</Text>
            <Pressable testID="retry-api-btn" onPress={() => healthQuery.refetch()} style={[styles.retryButton, { borderColor: colors.signal }]}>
              <Text style={[styles.retryText, { color: colors.signal }]}>{t("tryAgain")}</Text>
            </Pressable>
          </View>
        ) : null}
        {healthQuery.isFetching && !healthQuery.isError ? <Text style={[styles.connectionHint, { color: colors.mutedForeground }]}>{uiText(locale, "serverChecking")}</Text> : null}
        <TextInput testID="player-name-input" value={name} onChangeText={(value) => { setName(value); setMessage(""); }} maxLength={18} placeholder={uiText(locale, "playerName")} placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]} />
        <View style={styles.teamChoice}>
          {(["red", "blue"] as Team[]).map((value) => <Pressable testID={`team-${value}-btn`} key={value} onPress={() => { setTeam(value); setMessage(""); }} style={[styles.teamButton, { borderColor: value === "red" ? colors.signal : colors.cyan, backgroundColor: team === value ? (value === "red" ? "rgba(240,101,91,0.22)" : "rgba(102,227,208,0.18)") : colors.card }]}><Text style={{ color: value === "red" ? colors.signal : colors.cyan, fontWeight: "900" }}>{value === "red" ? uiText(locale, "teamRed") : uiText(locale, "teamBlue")}</Text></Pressable>)}
        </View>
        <Text style={[styles.sectionTitle, { color: colors.cyan }]}>{uiText(locale, "createRoom")}</Text>
        <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>{uiText(locale, "roomCreateHint")}</Text>
        <Pressable testID="create-room-btn" disabled={busy || !name.trim()} onPress={handleCreate} style={[styles.primary, { backgroundColor: colors.cyan }, (!name.trim() || busy) && styles.disabled]}>
          {create.isPending ? <ActivityIndicator color={colors.ink} /> : <><Text style={[styles.primaryText, { color: colors.ink }]}>{uiText(locale, "createRoom")}</Text><Feather name="plus" size={20} color={colors.ink} /></>}
        </Pressable>
        <View style={styles.or}><View style={[styles.line, { backgroundColor: colors.border }]} /><Text style={[styles.label, { color: colors.mutedForeground }]}>{t("continue")}</Text><View style={[styles.line, { backgroundColor: colors.border }]} /></View>
        <Text style={[styles.sectionTitle, { color: colors.cyan }]}>{uiText(locale, "joinRoom")}</Text>
        <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>{uiText(locale, "roomJoinHint")}</Text>
        <TextInput testID="room-code-input" value={code} onChangeText={(value) => { setCode(value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()); setMessage(""); }} maxLength={6} autoCapitalize="characters" autoCorrect={false} placeholder={uiText(locale, "roomCode")} placeholderTextColor={colors.mutedForeground} style={[styles.input, styles.codeInput, { color: colors.cyan, borderColor: colors.border, backgroundColor: colors.card }]} />
        <Pressable testID="join-room-btn" disabled={busy || !name.trim() || code.length !== 6} onPress={handleJoin} style={[styles.secondary, { borderColor: colors.cyan }, (busy || !name.trim() || code.length !== 6) && styles.disabled]}>
          {join.isPending ? <ActivityIndicator color={colors.cyan} /> : <Text style={[styles.primaryText, { color: colors.cyan }]}>{uiText(locale, "joinRoom")}</Text>}
        </Pressable>
        {message ? <Text style={[styles.error, { color: colors.signal }]}>{message}</Text> : null}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}
*/

const styles = StyleSheet.create({
  root: { flex: 1 },
  rtl: rtlLayout,
  header: { minHeight: 58, flexDirection: "row", alignItems: "center", paddingHorizontal: 18, gap: 14 },
  icon: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, textAlign: "center", fontSize: 15, fontWeight: "900", letterSpacing: 1.5 },
  formScroll: { flex: 1 },
  form: { padding: 20, paddingTop: 30, paddingBottom: 50 },
  hero: { fontSize: 30, lineHeight: 36, fontWeight: "900", letterSpacing: 0.5, marginBottom: 12 },
  helper: { fontSize: 13, lineHeight: 19 },
  sectionTitle: { fontSize: 12, fontWeight: "900", letterSpacing: 1.5, marginTop: 24 },
  sectionHint: { fontSize: 12, lineHeight: 18, marginTop: 5 },
  input: { height: 56, borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, fontSize: 16, fontWeight: "700", marginTop: 24 },
  teamChoice: { flexDirection: "row", gap: 12, marginTop: 14 },
  teamButton: { flex: 1, minHeight: 46, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  codeInput: { textAlign: "center", fontSize: 24, letterSpacing: 7, marginTop: 10 },
  primary: { minHeight: 58, borderRadius: 15, marginTop: 18, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  primaryText: { fontSize: 13, fontWeight: "900", letterSpacing: 1.2 },
  secondary: { minHeight: 56, borderWidth: 1, borderRadius: 15, marginTop: 12, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.4 },
  or: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 22 },
  line: { height: 1, flex: 1 },
  label: { fontSize: 9, fontWeight: "800", letterSpacing: 1.3 },
  error: { fontSize: 12, fontWeight: "700", textAlign: "center", marginTop: 14 },
  connectionCard: { borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 16, gap: 10 },
  connectionText: { fontSize: 12, lineHeight: 18, fontWeight: "700" },
  connectionHint: { fontSize: 11, marginTop: 12 },
  retryButton: { minHeight: 36, borderWidth: 1, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  retryText: { fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  codeWrap: { flex: 1, alignItems: "center" },
  code: { fontSize: 23, fontWeight: "900", letterSpacing: 5 },
  count: { width: 42, fontWeight: "900", textAlign: "right" },
  lobbyContent: { padding: 18, paddingBottom: 50 },
  markerCard: { borderRadius: 20, borderWidth: 2, padding: 16, flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 16 },
  markerTitle: { fontSize: 15, fontWeight: "900", marginBottom: 6 },
  teamCard: { borderRadius: 18, borderWidth: 1, padding: 15, marginBottom: 12 },
  teamTitle: { fontSize: 11, fontWeight: "900", letterSpacing: 1.4, marginBottom: 8 },
  playerRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 11 },
  playerName: { flex: 1, fontSize: 14, fontWeight: "700" },
  lives: { fontSize: 12, fontWeight: "800" },
  waiting: { minHeight: 60, borderWidth: 1, borderRadius: 15, marginTop: 18, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  pdfButton: { minHeight: 38, borderWidth: 1, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
});
