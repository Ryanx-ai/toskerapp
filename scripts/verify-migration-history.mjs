// Read-only: no migrate(), DDL, metadata repair, or data backfill.
// Run: dotenv -e .env.local -- node scripts/verify-migration-history.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { readMigrationFiles } from "drizzle-orm/migrator";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const sql = neon(process.env.DATABASE_URL);
const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
const snapshot = JSON.parse(readFileSync(`drizzle/meta/${String(journal.entries.at(-1).idx).padStart(4, "0")}_snapshot.json`, "utf8"));
const migrations = readMigrationFiles({ migrationsFolder: "drizzle" });
const applied = await sql`select hash, created_at from drizzle.__drizzle_migrations order by created_at`;
assert.equal(applied.length, migrations.length, "Migration count differs");
migrations.forEach((migration, index) => {
  assert.equal(Number(applied[index].created_at), migration.folderMillis, `Journal timestamp: ${journal.entries[index].tag}`);
  assert.equal(applied[index].hash, migration.hash, `Checksum: ${journal.entries[index].tag}`);
  console.log(`PASS ${journal.entries[index].tag} ${migration.hash}`);
});

const columns = await sql`
  select c.relname as table_name, a.attname as name, format_type(a.atttypid,a.atttypmod) as type,
    a.attnotnull as not_null, pg_get_expr(d.adbin,d.adrelid) as column_default
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
  left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum
  where n.nspname='public' and c.relkind='r'`;
const enums = await sql`
  select t.typname as name, json_agg(e.enumlabel order by e.enumsortorder) as values
  from pg_type t join pg_namespace n on n.oid=t.typnamespace join pg_enum e on e.enumtypid=t.oid
  where n.nspname='public' group by t.typname`;
const constraints = await sql`
  select c.relname as table_name, k.conname as name, k.contype as type,
    pg_get_constraintdef(k.oid) as definition
  from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and k.contype <> 'n'`;
const indexes = await sql`
  select t.relname as table_name, i.relname as name, x.indisunique as unique, am.amname as method,
    pg_get_expr(x.indpred,x.indrelid) as predicate,
    array_to_json(array(select pg_get_indexdef(x.indexrelid,s,true) from generate_series(1,x.indnkeyatts) s)) as columns
  from pg_index x join pg_class t on t.oid=x.indrelid join pg_namespace n on n.oid=t.relnamespace
  join pg_class i on i.oid=x.indexrelid join pg_am am on am.oid=i.relam
  where n.nspname='public'`;
const normalize = (value) => String(value ?? "").replace(/::[\w\s]+(?=[),]|$)/g, "").replace(/"|\bpublic\./g, "").replace(/[\s()]/g, "").toLowerCase();
const names = (values) => values.map((value) => value.name).sort();
assert.deepEqual([...new Set(columns.map((column) => column.table_name))].sort(), Object.values(snapshot.tables).map((table) => table.name).sort(), "Table set");
assert.deepEqual(names(enums), names(Object.values(snapshot.enums)), "Enum set");
for (const expected of Object.values(snapshot.enums)) {
  assert.deepEqual(enums.find((value) => value.name === expected.name)?.values, expected.values, `Enum ${expected.name}`);
}
for (const table of Object.values(snapshot.tables)) {
  const actual = columns.filter((column) => column.table_name === table.name);
  assert.deepEqual(names(actual), names(Object.values(table.columns)), `Columns ${table.name}`);
  for (const column of Object.values(table.columns)) {
    const value = actual.find((entry) => entry.name === column.name);
    assert.equal(value.type.replaceAll('"', ''), column.type, `Type ${table.name}.${column.name}`);
    assert.equal(value.not_null, column.notNull || column.primaryKey, `Nullability ${table.name}.${column.name}`);
    assert.equal(normalize(value.column_default), normalize(column.default), `Default ${table.name}.${column.name}`);
  }
  const expectedConstraints = [
    ...Object.values(table.foreignKeys).map((key) => ({ name: key.name, type: "f", definition: `FOREIGN KEY (${key.columnsFrom.join(", ")}) REFERENCES ${key.tableTo}(${key.columnsTo.join(", ")})${key.onUpdate !== "no action" ? ` ON UPDATE ${key.onUpdate}` : ""}${key.onDelete !== "no action" ? ` ON DELETE ${key.onDelete}` : ""}` })),
    ...Object.values(table.compositePrimaryKeys).map((key) => ({ name: key.name, type: "p", definition: `PRIMARY KEY (${key.columns.join(", ")})` })),
    ...Object.values(table.columns).filter((column) => column.primaryKey).map((column) => ({ name: `${table.name}_pkey`, type: "p", definition: `PRIMARY KEY (${column.name})` })),
    ...Object.values(table.uniqueConstraints).map((key) => ({ name: key.name, type: "u", definition: `UNIQUE (${key.columns.join(", ")})` })),
    ...Object.values(table.checkConstraints).map((key) => ({ name: key.name, type: "c", definition: `CHECK (${key.value})` })),
  ];
  const actualConstraints = constraints.filter((value) => value.table_name === table.name);
  assert.deepEqual(names(actualConstraints), names(expectedConstraints), `Constraint set ${table.name}`);
  for (const constraint of expectedConstraints) {
    const value = actualConstraints.find((entry) => entry.name === constraint.name);
    assert.equal(value.type, constraint.type);
    assert.equal(normalize(value.definition), normalize(constraint.definition), `Constraint ${constraint.name}`);
  }
  for (const index of Object.values(table.indexes)) {
    const value = indexes.find((entry) => entry.table_name === table.name && entry.name === index.name);
    assert.ok(value, `Index ${index.name}`);
    assert.equal(value.unique, index.isUnique, `Unique ${index.name}`);
    assert.equal(value.method, index.method, `Method ${index.name}`);
    assert.deepEqual(value.columns.map(normalize), index.columns.map((column) => normalize(`${column.expression}${column.asc ? "" : " DESC"}${column.nulls === (column.asc ? "last" : "first") ? "" : ` NULLS ${column.nulls}`}`)), `Columns ${index.name}`);
    assert.equal(normalize(value.predicate), normalize(index.where).replaceAll(`${table.name}.`, ""), `Predicate ${index.name}`);
  }
}
console.log(JSON.stringify({ verification: "PASS", readOnly: true, migrations: migrations.length, tables: Object.keys(snapshot.tables).length, columns: columns.length, constraints: constraints.length, enums: enums.length, schema: "catalog matches latest snapshot (columns/defaults/constraints/enums/declared indexes)" }));
