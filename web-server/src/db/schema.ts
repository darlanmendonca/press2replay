import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Funcionarios da quadra/clube que usam o painel de administracao. Esta e
// tambem a tabela de usuarios do Better Auth (ver src/lib/auth.ts): `email`,
// `emailVerified` e `image` sao colunas que ele exige.
// `isAdmin` = pode criar e gerenciar outros funcionarios. Quem nao e admin
// so cria salas (a turma que publica videos sob um mesmo id). Se as
// permissoes crescerem, isto evolui pra um `role`.
export const venueStaff = pgTable("venue_staff", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// --- Tabelas do Better Auth (geradas por `npx auth@latest generate`) ---

export const session = pgTable(
  "session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => venueStaff.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => venueStaff.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const venueStaffRelations = relations(venueStaff, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  venueStaff: one(venueStaff, { fields: [session.userId], references: [venueStaff.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  venueStaff: one(venueStaff, { fields: [account.userId], references: [venueStaff.id] }),
}));

// Local (clube/arena). `id` e o que vai na URL publica e no QR impresso da
// quadra (/replays/{venueId}/{courtId}): definido na criacao e imutavel depois.
// Cada local tem UMA chave de edge (o edge e um so por local e sobe replays de
// qualquer quadra dele): guardamos so o hash sha256; o valor em claro aparece
// uma unica vez, quando o admin a gera.
export const venue = pgTable("venue", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  edgeKeyHash: text("edge_key_hash").unique(),
  edgeKeyCreatedAt: timestamp("edge_key_created_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Quadra de um local. `id` so e unico dentro do local (PK composta) e, como o
// do local, e imutavel (esta impresso no QR). `sport` e o esporte padrao.
export const court = pgTable(
  "court",
  {
    venueId: text("venue_id")
      .notNull()
      .references(() => venue.id, { onDelete: "restrict" }),
    id: text("id").notNull(),
    name: text("name").notNull(),
    sport: text("sport").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [primaryKey({ columns: [table.venueId, table.id] })],
);

export type Venue = typeof venue.$inferSelect;
export type Court = typeof court.$inferSelect;

// Replays enviados pelo edge-server. Uma quadra pode ter varias cameras
// (angulos): um aperto do botao gera UM momento (`momentId`, o mesmo em todas)
// com um replay por camera (`cameraId`, livre e unico so dentro da quadra; nao
// ha tabela de cameras, o edge manda o id). Replays antigos viram momentos de
// uma camera so ('main'). `venueId`/`courtId` ficam denormalizados
// (sem FK: o replay e efemero, expira em 2h, e nao deve travar mudancas nas
// quadras) e `sport` e o esporte "publicado" naquele momento: o do edge, que
// cortou o video com a duracao dele. So guardamos as chaves (pathnames) do
// storage, nunca URLs: o storage e privado e o acesso e sempre via
// /api/replays/[id]/... (ver src/lib/storage.ts). A linha so e criada depois do
// upload dos arquivos confirmado, entao nao ha "pendente".
export const replay = pgTable(
  "replay",
  {
    id: uuid("id").primaryKey(), // gerado pelo edge; faz parte da chave no storage
    venueId: text("venue_id").notNull(),
    courtId: text("court_id").notNull(),
    cameraId: text("camera_id").notNull().default("main"),
    momentId: uuid("moment_id").notNull().defaultRandom(),
    sport: text("sport").notNull(),
    videoPath: text("video_path").notNull(),
    spritePath: text("sprite_path"),
    spriteFrames: integer("sprite_frames"),
    spriteColumns: integer("sprite_columns"),
    durationSeconds: integer("duration_seconds"),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("replay_court_created_idx").on(table.venueId, table.courtId, table.createdAt),
    index("replay_expires_idx").on(table.expiresAt),
  ],
);

export type Replay = typeof replay.$inferSelect;
export type NewReplay = typeof replay.$inferInsert;
export type VenueStaff = typeof venueStaff.$inferSelect;
export type NewVenueStaff = typeof venueStaff.$inferInsert;
