import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for database verification.");
}

const sql = neon(databaseUrl);
const expectedTables = [
  "connections",
  "conversation_participants",
  "conversations",
  "hall_items",
  "invites",
  "messages",
  "notifications",
  "profiles",
  "room_capabilities",
  "room_memberships",
  "room_tags",
  "rooms",
  "users",
];
const expectedIndexes = [
  "connections_direction_unique",
  "conversation_participants_conversation_id_user_id_pk",
  "invites_token_hash_unique",
  "messages_conversation_order_idx",
  "conversations_primary_room_unique",
  "conversations_sandbox_owner_unique",
  "conversations_personal_pair_unique",
  "room_capabilities_room_id_capability_key_pk",
  "room_memberships_room_id_user_id_pk",
  "rooms_slug_unique",
  "users_auth_identity_unique",
  "users_tid_unique",
];

const [{ databaseName, serverVersion }] = await sql`
  select current_database() as "databaseName",
         current_setting('server_version') as "serverVersion"
`;
const tableRows = await sql`
  select table_name as "tableName"
  from information_schema.tables
  where table_schema = 'public'
  order by table_name
`;
const indexRows = await sql`
  select indexname as "indexName"
  from pg_indexes
  where schemaname = 'public'
  order by indexname
`;
const [{ foreignKeyCount }] = await sql`
  select count(*)::int as "foreignKeyCount"
  from information_schema.table_constraints
  where constraint_schema = 'public'
    and constraint_type = 'FOREIGN KEY'
`;
const [{ migrationCount }] = await sql`
  select count(*)::int as "migrationCount"
  from drizzle.__drizzle_migrations
`;
const [{ userCount }] = await sql`select count(*)::int as "userCount" from users`;

const actualTables = new Set(tableRows.map(({ tableName }) => tableName));
const actualIndexes = new Set(indexRows.map(({ indexName }) => indexName));
const missingTables = expectedTables.filter((table) => !actualTables.has(table));
const missingIndexes = expectedIndexes.filter((index) => !actualIndexes.has(index));

if (missingTables.length || missingIndexes.length || migrationCount < 1) {
  throw new Error(
    JSON.stringify({ missingTables, missingIndexes, migrationCount }),
  );
}

console.log(
  JSON.stringify(
    {
      connection: "ok",
      databaseName,
      serverVersion,
      expectedTableCount: expectedTables.length,
      foreignKeyCount,
      migrationCount,
      userCount,
      verifiedIndexes: expectedIndexes.length,
    },
    null,
    2,
  ),
);
