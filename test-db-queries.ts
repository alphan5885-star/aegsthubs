import db from "./src/server/db";

async function run() {
  console.log("Testing db connection...");
  const res = await db.prepare('SELECT 1 as num').get();
  console.log("Query 1:", res);

  const res2 = await db.prepare('SELECT * FROM "Kullanicilar" WHERE identifier = ?').get("testuser@local.aeigsthub");
  console.log("Query 2:", res2);
  
  const res3 = await db.prepare('INSERT INTO "Kullanicilar" (id, identifier, access_code_hash, role) VALUES (?, ?, ?, ?) RETURNING id').run("uuid-1234", "testuser@local.aeigsthub", "hash123", "buyer");
  console.log("Insert 1:", res3);

  const res4 = await db.prepare('SELECT * FROM "Kullanicilar" WHERE identifier = ?').get("testuser@local.aeigsthub");
  console.log("Query 3:", res4);
  process.exit();
}
run();
