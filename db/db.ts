import { awsCredentialsProvider } from "@vercel/functions/oidc";
import { attachDatabasePool } from "@vercel/functions";
import { Signer } from "@aws-sdk/rds-signer";
import { ClientBase, Pool } from "pg";

const signer = new Signer({
  hostname: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  username: process.env.PGUSER,
  region: process.env.AWS_REGION,
  credentials: awsCredentialsProvider({
    roleArn: process.env.AWS_ROLE_ARN,
    clientConfig: { region: process.env.AWS_REGION },
  }),
});

const poolConfig: any = {
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  database: process.env.PGDATABASE || "postgres",
  password: process.env.PGPASSWORD || (() => signer.getAuthToken()),
  port: Number(process.env.PGPORT),
  max: 20,
};
if (process.env.PGSSLMODE === 'require') {
  poolConfig.ssl = { rejectUnauthorized: false };
}
export const pool = new Pool(poolConfig);
attachDatabasePool(pool);

// Single query transaction.
export async function query(sql: string, args: unknown[]) {
  return pool.query(sql, args);
}

// Use it for multiple queries transaction.
export async function withConnection<T>(
  fn: (client: ClientBase) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}