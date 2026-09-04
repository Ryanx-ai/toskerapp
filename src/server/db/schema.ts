import {
  index,
  integer,
  boolean,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const connectionStatus = pgEnum("connection_status", [
  "pending",
  "accepted",
]);
export const membershipRole = pgEnum("membership_role", ["owner", "member"]);
export const inviteStatus = pgEnum("invite_status", [
  "pending",
  "accepted",
  "revoked",
  "expired",
]);
export const conversationKind = pgEnum("conversation_kind", [
  "sandbox",
  "personal",
  "room",
]);
export const hallItemKind = pgEnum("hall_item_kind", [
  "note",
  "pinned_message",
]);
export const presenceStatus = pgEnum("presence_status", [
  "online",
  "idle",
  "away",
  "meeting",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authProvider: text("auth_provider").notNull(),
    authSubject: text("auth_subject").notNull(),
    tid: text("tid").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_auth_identity_unique").on(
      table.authProvider,
      table.authSubject,
    ),
    uniqueIndex("users_tid_unique").on(table.tid),
  ],
);

export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  username: text("username").notNull(),
  avatarUrl: text("avatar_url"),
  status: text("status"),
  presenceStatus: presenceStatus("presence_status").default("online").notNull(),
  namecardBio: text("namecard_bio"),
  ...timestamps,
}, (table) => [uniqueIndex("profiles_username_unique").on(table.username)]);

export const connections = pgTable(
  "connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    addresseeId: uuid("addressee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    pairKey: text("pair_key").notNull(),
    status: connectionStatus("status").default("pending").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("connections_direction_unique").on(
      table.requesterId,
      table.addresseeId,
    ),
    uniqueIndex("connections_pair_unique").on(table.pairKey),
    index("connections_addressee_idx").on(table.addresseeId),
  ],
);

export const connectionNicknames = pgTable(
  "connection_nicknames",
  {
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => connections.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    nickname: text("nickname").notNull(),
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.connectionId, table.userId] })],
);

export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    ...timestamps,
  },
  (table) => [
    index("rooms_owner_idx").on(table.ownerId),
    uniqueIndex("rooms_slug_unique").on(table.slug),
  ],
);

export const roomTags = pgTable(
  "room_tags",
  {
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
  },
  (table) => [primaryKey({ columns: [table.roomId, table.value] })],
);

export const roomMemberships = pgTable(
  "room_memberships",
  {
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: membershipRole("role").default("member").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.roomId, table.userId] }),
    index("room_memberships_user_idx").on(table.userId),
  ],
);

export const invites = pgTable(
  "invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tokenHash: text("token_hash").notNull(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    inviterId: uuid("inviter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipientUserId: uuid("recipient_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    recipientHint: text("recipient_hint"),
    status: inviteStatus("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("invites_token_hash_unique").on(table.tokenHash),
    index("invites_room_idx").on(table.roomId),
    index("invites_recipient_idx").on(table.recipientUserId),
  ],
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kind: conversationKind("kind").notNull(),
    ownerId: uuid("owner_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    roomId: uuid("room_id").references(() => rooms.id, {
      onDelete: "cascade",
    }),
    isPrimary: boolean("is_primary").default(false).notNull(),
    directKey: text("direct_key"),
    title: text("title"),
    ...timestamps,
  },
  (table) => [
    index("conversations_room_idx").on(table.roomId),
    uniqueIndex("conversations_sandbox_owner_unique")
      .on(table.ownerId)
      .where(sql`${table.kind} = 'sandbox'`),
    uniqueIndex("conversations_primary_room_unique")
      .on(table.roomId)
      .where(sql`${table.kind} = 'room' and ${table.isPrimary} = true`),
    uniqueIndex("conversations_personal_pair_unique")
      .on(table.directKey)
      .where(sql`${table.kind} = 'personal'`),
  ],
);

export const conversationParticipants = pgTable(
  "conversation_participants",
  {
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.conversationId, table.userId] }),
    index("conversation_participants_user_idx").on(table.userId),
  ],
);

export const conversationReads = pgTable(
  "conversation_reads",
  {
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastReadAt: timestamp("last_read_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.conversationId, table.userId] }),
    index("conversation_reads_user_idx").on(table.userId),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    replyToId: uuid("reply_to_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
  },
  (table) => [
    index("messages_conversation_order_idx").on(
      table.conversationId,
      table.createdAt,
      table.id,
    ),
  ],
);

export const hallItems = pgTable(
  "hall_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id").references(() => rooms.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id").references(() => conversations.id, {
      onDelete: "cascade",
    }),
    kind: hallItemKind("kind").notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    title: text("title"),
    body: text("body"),
    sourceMessageId: uuid("source_message_id").references(() => messages.id, {
      onDelete: "restrict",
    }),
    color: text("color").default("neutral").notNull(),
    position: integer("position").default(0).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("hall_items_room_idx").on(table.roomId, table.createdAt),
    uniqueIndex("hall_items_pinned_message_unique")
      .on(table.sourceMessageId)
      .where(sql`${table.kind} = 'pinned_message'`),
  ],
);

export const roomCapabilities = pgTable(
  "room_capabilities",
  {
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    capabilityKey: text("capability_key").notNull(),
    installedById: uuid("installed_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    installedAt: timestamp("installed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.roomId, table.capabilityKey] })],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    roomId: uuid("room_id").references(() => rooms.id, {
      onDelete: "cascade",
    }),
    conversationId: uuid("conversation_id").references(() => conversations.id, {
      onDelete: "cascade",
    }),
    messageId: uuid("message_id").references(() => messages.id, {
      onDelete: "cascade",
    }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("notifications_user_order_idx").on(table.userId, table.createdAt)],
);

export type ToskerUser = typeof users.$inferSelect;
export type ToskerProfile = typeof profiles.$inferSelect;
export type ToskerRoom = typeof rooms.$inferSelect;
export type ToskerConversation = typeof conversations.$inferSelect;
export type ToskerMessage = typeof messages.$inferSelect;
