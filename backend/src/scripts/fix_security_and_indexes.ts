import { AppDataSource, initDb } from '../config/db';

async function fixSupabaseWarnings() {
  console.log('Connecting to database...');
  await initDb();
  console.log('Connected successfully!');

  // 1. Enable RLS on all public tables
  const tablesResult: Array<{ table_name: string }> = await AppDataSource.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  `);

  console.log(`Found ${tablesResult.length} public tables. Enabling Row Level Security (RLS)...`);
  for (const row of tablesResult) {
    const tableName = row.table_name;
    try {
      await AppDataSource.query(`ALTER TABLE "public"."${tableName}" ENABLE ROW LEVEL SECURITY;`);
      console.log(`  [RLS Enabled] public."${tableName}"`);
    } catch (e: any) {
      console.error(`  Error enabling RLS on ${tableName}:`, e.message);
    }
  }

  // 2. Identify unindexed foreign keys and create indexes
  console.log('\nChecking for unindexed foreign keys...');
  const unindexedFksQuery = `
    SELECT
        c.conrelid::regclass::text AS table_name,
        c.conname AS constraint_name,
        string_agg(quote_ident(att.attname), ', ' ORDER BY u.attposition) AS columns_clause,
        string_agg(att.attname, '_' ORDER BY u.attposition) AS col_suffix
    FROM pg_constraint c
    JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS u(attnum, attposition) ON true
    JOIN pg_attribute att ON att.attrelid = c.conrelid AND att.attnum = u.attnum
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.contype = 'f' AND n.nspname = 'public'
    AND NOT EXISTS (
        SELECT 1 FROM pg_index i
        WHERE i.indrelid = c.conrelid
        AND i.indkey[0:array_length(c.conkey, 1) - 1] = c.conkey
    )
    GROUP BY c.conrelid, c.conname;
  `;

  const unindexedFks: Array<{
    table_name: string;
    constraint_name: string;
    columns_clause: string;
    col_suffix: string;
  }> = await AppDataSource.query(unindexedFksQuery);

  console.log(`Found ${unindexedFks.length} unindexed foreign key constraints.`);
  for (const fk of unindexedFks) {
    const rawTableName = fk.table_name.replace(/^public\./, '').replace(/"/g, '');
    const cleanSuffix = fk.col_suffix.replace(/[^a-zA-Z0-9_]/g, '_');
    const indexName = `idx_${rawTableName}_${cleanSuffix}`.substring(0, 60);

    const ddl = `CREATE INDEX IF NOT EXISTS "${indexName}" ON ${fk.table_name} (${fk.columns_clause});`;
    try {
      await AppDataSource.query(ddl);
      console.log(`  [Index Created] ${indexName} on ${fk.table_name} (${fk.columns_clause})`);
    } catch (e: any) {
      console.error(`  Error creating index for ${fk.table_name}:`, e.message);
    }
  }

  console.log('\nSupabase warning fixes applied successfully!');
  await AppDataSource.destroy();
}

fixSupabaseWarnings().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
