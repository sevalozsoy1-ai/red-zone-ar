let battleSessionToken: string | null = null;

/**
 * The API client asks this getter immediately before each request. Keeping the
 * token in memory avoids putting a bearer credential in a polling URL while
 * still allowing the lobby and battle screen to share one session.
 */
export function getBattleSessionToken() {
  return battleSessionToken;
}

export function setBattleSessionToken(token: string | null) {
  battleSessionToken = token;
}