import { readFile } from "node:fs/promises";
import path from "node:path";

import { withConnection } from "../db/db";

async function main() {
  const schemaPath = path.resolve(process.cwd(), "db/schema.sql");
  const sql = await readFile(schemaPath, "utf8");

  console.info(`Applying schema from ${schemaPath}`);

  await withConnection(async (client) => {
    await client.query(sql);
  });

  console.info("Schema applied successfully.");
}

main().catch((error) => {
  console.error("Failed to apply schema:", error);
  process.exitCode = 1;
});
