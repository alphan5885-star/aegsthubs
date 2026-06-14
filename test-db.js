const postgres = require('postgres');
const sql = postgres('postgresql://neondb_owner:npg_TsDaYrkJM1G7@ep-hidden-field-ap269y9n-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');
sql`SELECT 1`.then(console.log).catch(console.error).finally(() => process.exit());
