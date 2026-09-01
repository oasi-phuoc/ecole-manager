const fs = require("fs");
const path = require("path");
const { Client } = require("../supabase/functions/api-proxy/node_modules/pg");

const envPath = path.join(__dirname, "..", "backend", ".env.supabase");
const env = fs.readFileSync(envPath, "utf8");
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim();

async function main() {
  const client = new Client({
    host: get("SUPABASE_DB_HOST"),
    port: 5432,
    user: "postgres",
    password: get("SUPABASE_DB_PASSWORD"),
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const sql = fs.readFileSync(
    path.join(__dirname, "..", "supabase", "migrations", "20260901180000_admin_identifiant.sql"),
    "utf8",
  );
  await client.query(sql);
  const r = await client.query(
    "SELECT id, email, identifiant, mfa_enabled FROM utilisateurs WHERE role = 'admin' LIMIT 5",
  );
  console.log(JSON.stringify(r.rows, null, 2));
  await client.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
