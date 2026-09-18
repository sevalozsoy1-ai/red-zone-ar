---
name: Presence deadline ordering
description: Deterministic multiplayer results when inactivity timers run late.
---

Evaluate departures in chronological deadline groups, batching only players with the same deadline.

**Why:** Removing all overdue players together can yield a draw under server load where an on-time timer would award the later-expiring team a win. The result must depend on recorded activity, not event-loop timing.

**How to apply:** Preserve logical deadline ordering when changing disconnect handling, schedulers, or timeout tests. Cover both identical deadlines and a delayed sweep spanning distinct deadlines.