import { bigint, jsonb, pgTable, text } from "drizzle-orm/pg-core";

/**
 * Durable room snapshots for the camera battle service.
 *
 * The battle service keeps its hot state in memory, but writes an authoritative
 * snapshot after every mutation.  Keeping the snapshot in the existing
 * application database means a server process can be replaced without
 * discarding a live match.
 */
export const battleRoomsTable = pgTable("battle_rooms", {
  code: text("code").primaryKey(),
  state: jsonb("state").notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export type BattleRoomRow = typeof battleRoomsTable.$inferSelect;
export type InsertBattleRoomRow = typeof battleRoomsTable.$inferInsert;