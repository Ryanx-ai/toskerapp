import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const sql = neon(process.env.DATABASE_URL);

const [counts] = await sql`
  select
    (select count(*)::int from users) as users,
    (select count(*)::int from profiles) as profiles,
    (select count(*)::int from conversations where kind = 'sandbox') as sandboxes,
    (select count(*)::int from rooms) as rooms,
    (select count(*)::int from room_memberships) as memberships,
    (select count(*)::int from conversations where kind = 'personal') as personal_conversations,
    (select count(*)::int from messages) as messages,
    (select count(*)::int from hall_items where kind = 'note') as hall_notes,
    (select count(*)::int from hall_items where kind = 'pinned_message' and source_message_id is not null) as hall_pins,
    (select count(*)::int from room_capabilities) as capabilities,
    (select count(*)::int from connections where status = 'accepted') as accepted_connections,
    (select count(*)::int from notifications) as notifications
`;
const [integrity] = await sql`
  select
    (select count(*)::int from (select owner_id from conversations where kind='sandbox' group by owner_id having count(*) <> 1) x) as invalid_sandbox_owners,
    (select count(*)::int from (select tid from users group by tid having count(*) > 1) x) as duplicate_tids,
    (select count(*)::int from (select room_id,user_id from room_memberships group by room_id,user_id having count(*) > 1) x) as duplicate_memberships,
    (select count(*)::int from (select direct_key from conversations where kind='personal' group by direct_key having count(*) > 1) x) as duplicate_personal_pairs,
    (select count(*)::int from hall_items h left join messages m on m.id=h.source_message_id where h.kind='pinned_message' and m.id is null) as orphan_hall_pins
`;

if (counts.users < 2 || counts.profiles !== counts.users || counts.sandboxes !== counts.users || counts.memberships < 2 || counts.messages < 4 || counts.hall_notes < 2 || counts.hall_pins < 1 || counts.capabilities < 2 || counts.accepted_connections < 1) throw new Error("MS5 acceptance data is incomplete.");
if (Object.values(integrity).some((value) => value !== 0)) throw new Error(`MS5 integrity failure: ${JSON.stringify(integrity)}`);

console.log(JSON.stringify({ audit: "ok", ...counts, ...integrity }, null, 2));
