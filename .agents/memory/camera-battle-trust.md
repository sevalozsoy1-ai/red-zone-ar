---
name: Camera battle trust boundary
description: Security boundary between on-device camera recognition and authoritative multiplayer game state.
---

Camera marker recognition is an on-device sensor signal, not proof the server can independently reproduce. Bind every command to an unforgeable server-issued player session, then let the server own opponent eligibility, fire rate, lives, death, respawn, and match completion. Multiplayer is free-for-all: there are no teams, and every other player is an enemy.

**Why:** A caller-supplied player identifier lets clients impersonate shooters and directly remove another player's lives. Commodity mobile clients cannot provide fully trusted raw-camera attestation, so the practical boundary must be explicit.

**How to apply:** When extending camera battles, never accept player identity as command authority. Resolve it from the server session and validate all state transitions there; use camera-derived marker data only as the authenticated player's observation. Keep realtime sockets as an additive transport over the same authoritative store operations, retain REST state sync as recovery, and persist shot deduplication with combat state. Do not reintroduce team selection, team filtering, friendly-fire checks, or team winners.