import 'dotenv/config';
import postgres from 'postgres';

async function check() {
  const sql = postgres(process.env.DATABASE_URL!);
  const res = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
  console.log('Tables en prod:');
  res.forEach((r: any) => console.log(' -', r.table_name));
  await sql.end();
}

check().catch(e => { console.error(e.message); process.exit(1); });
