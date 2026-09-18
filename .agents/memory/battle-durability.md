---
name: Battle durability constraints
description: Why multiplayer persistence requires atomic cross-instance updates and timestamp-based presence.
---

Treat database state as authoritative across instances; do not restore a
process-local cache plus unconditional snapshot saves.

**Why:** That design lost updates during overlapping instances and exposed
mutations even when persistence failed. A rejected promise tail also prevented
all later saves.

**How to apply:** Keep transaction rollback and cross-instance serialization
when optimizing persistence. The coarse global transaction lock was chosen for
correctness at the current small scale, not as a high-throughput design; move
to room-scoped locks only with concurrency and failure tests.

Do not mark every player disconnected at server startup.

**Why:** A second server or rolling deployment is not a player disconnection.
Startup-wide resets shortened healthy players' grace periods.

**How to apply:** Derive presence and expiry from durable last-seen timestamps,
and test starting a second instance while a player's lease is still fresh.