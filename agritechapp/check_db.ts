import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const client = postgres(process.env.DATABASE_URL!);

  const producers = await client`
    SELECT id, nom, position FROM profils WHERE role = 'producteur' LIMIT 5
  `;
  console.log("PRODUCERS (positions):", JSON.stringify(producers, null, 2));

  // Verify ST_DWithin works for N'Dali signalement
  const test = await client`
    SELECT COUNT(*) as total FROM profils
    WHERE role = 'producteur'
      AND position IS NOT NULL
      AND ST_DWithin(
        ST_GeomFromText(position, 4326)::geography,
        ST_GeomFromText('POINT(2.73 9.85)', 4326)::geography,
        10000
      )
  `;
  console.log("Producteurs dans rayon 10km de N'Dali:", test[0].total);

  await client.end();
}

main().catch(console.error);
