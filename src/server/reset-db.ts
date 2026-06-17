import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const conn = postgres(process.env.DATABASE_URL!);
const db = drizzle(conn);

async function main() {
  console.log("Deleting corsair_entities...");
  await conn`DELETE FROM corsair_entities`;

  console.log("Deleting corsair_accounts...");
  await conn`DELETE FROM corsair_accounts`;

  console.log("Deleting auth sessions...");
  await conn`DELETE FROM session`;

  console.log("Deleting auth accounts...");
  await conn`DELETE FROM account`;

  console.log("Deleting auth users...");
  await conn`DELETE FROM "user"`;
  
  console.log("Deleting corsair_integrations...");
  await conn`DELETE FROM corsair_integrations`;

  console.log("Done.");
  process.exit(0);
}

main().catch(console.error);
