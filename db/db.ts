import { awsCredentialsProvider } from "@vercel/functions/oidc";
import { attachDatabasePool } from "@vercel/functions";
import { Signer } from "@aws-sdk/rds-signer";
import { ClientBase, Pool } from "pg";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const signer = new Signer({
  hostname: requireEnv('PGHOST'),
  port: Number(requireEnv('PGPORT')),
  username: requireEnv('PGUSER'),
  region: requireEnv('AWS_REGION'),
  credentials: awsCredentialsProvider({
    roleArn: requireEnv('AWS_ROLE_ARN'),
    clientConfig: { region: requireEnv('AWS_REGION') },
  }),
});

const poolConfig: any = {
  host: requireEnv('PGHOST'),
  user: requireEnv('PGUSER'),
  database: process.env.PGDATABASE || "postgres",
  password: process.env.PGPASSWORD || (() => signer.getAuthToken()),
  port: Number(requireEnv('PGPORT')),
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