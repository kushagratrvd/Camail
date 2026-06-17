import { corsair } from '../src/server/corsair';

async function test() {
  try {
    const tenant = corsair.withTenant('6yyCT8n7ObnWLBWvSY0FWhGjch0qJprp');
    console.log('Tenant keys:', Object.keys(tenant));
    console.log('gmail in tenant:', 'gmail' in tenant);
    if ('gmail' in tenant) {
      console.log('gmail keys:', Object.keys((tenant as any).gmail));
    }
  } catch (err) {
    console.error('Error during test:', err);
  }
}

test();
