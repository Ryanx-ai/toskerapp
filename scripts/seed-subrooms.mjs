import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const rooms = await sql`select id, name from rooms order by created_at asc limit 1`;
if (!rooms[0]) {
  console.log(JSON.stringify({ seeded: false, reason: "No development room found" }));
  process.exit(0);
}
const members = await sql`select user_id as id, role from room_memberships where room_id = ${rooms[0].id} order by joined_at asc`;
if (!members.length) process.exit(0);
const seed = async (name, visibility, ids) => {
  const existing = await sql`select id from subrooms where room_id = ${rooms[0].id} and name = ${name} limit 1`;
  if (existing[0]) return existing[0].id;
  const [subroom] = await sql`insert into subrooms (room_id, name, created_by, visibility, position) values (${rooms[0].id}, ${name}, ${members[0].id}, ${visibility}, 0) returning id`;
  const access = visibility === "everyone" ? members.map((member) => member.id) : visibility === "owners" ? members.filter((member) => member.role === "owner").map((member) => member.id) : ids;
  for (const userId of [...new Set(access)]) {
    await sql`insert into subroom_access (subroom_id, user_id) values (${subroom.id}, ${userId}) on conflict do nothing`;
  }
  const [conversation] = await sql`insert into conversations (kind, room_id, subroom_id, title) values ('room', ${rooms[0].id}, ${subroom.id}, ${name}) returning id`;
  for (const userId of [...new Set(access)]) {
    await sql`insert into conversation_participants (conversation_id, user_id) values (${conversation.id}, ${userId}) on conflict do nothing`;
  }
  return subroom.id;
};
await seed("ONIC MLBB", "everyone", members.map((member) => member.id));
await seed("ONIC UNITE", "everyone", members.map((member) => member.id));
await seed("ONIC Management", "selected", [members[0].id]);
console.log(JSON.stringify({ seeded: true, room: rooms[0].name, subrooms: 3 }));
