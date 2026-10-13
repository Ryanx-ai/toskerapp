/** Fixed, bounded expiry predicate shared by independent consumers. Call inside
 * a transaction with a short lock/statement timeout. No caller interpolation,
 * coordinate-bearing RETURNING, preserved-content deletion, or history. */
export const LOCATION_EXPIRY_SWEEP_SQL = `
with expired as materialized (
  select user_id, id from location_shares where expires_at <= clock_timestamp()
  order by expires_at limit 500 for update skip locked
), retired as (
  delete from location_shares s using expired e
  where s.user_id=e.user_id and s.id=e.id and s.expires_at <= clock_timestamp()
  returning 1
), expired_obligations as materialized (
  select id from location_cleanup_reservations where expires_at <= clock_timestamp()
  order by expires_at limit 500 for update skip locked
), obligations as (
  delete from location_cleanup_reservations r using expired_obligations e
  where r.id=e.id and r.expires_at <= clock_timestamp() returning 1
), old_counters as (
  delete from location_cleanup_budget
  where day < to_char(clock_timestamp() at time zone 'UTC' - interval '2 days', 'YYYY-MM-DD') returning 1
)
select (select count(*)::int from retired) as expired_consents,
       (select count(*)::int from obligations) as expired_obligations,
       (select count(*)::int from old_counters) as old_counters
`;

export const LOCATION_RESCUE_ACK_SQL = `
insert into location_cleanup_health(slot,rescue_at) values(1,clock_timestamp())
on conflict(slot) do update set rescue_at=excluded.rescue_at
`;
