import { db, conn } from '../src/server/db';
import { createCorsairDatabase } from 'corsair/db';

async function main() {
  try {
    const database = createCorsairDatabase(conn);
    const integrations = await database.db.selectFrom('corsair_integrations').selectAll().execute();
    console.log('Integrations:', integrations);
    
    const accounts = await database.db.selectFrom('corsair_accounts').selectAll().execute();
    console.log('Corsair Accounts count:', accounts.length);
    console.log('Corsair Accounts:', accounts);

    const users = await db.query.users.findMany();
    console.log('Users:', users);

    const betterAuthAccounts = await db.query.accounts.findMany();
    console.log('Better-Auth Accounts:', betterAuthAccounts);
  } catch (err) {
    console.error('DB Check error:', err);
  } finally {
    process.exit(0);
  }
}

main();
