import { awsCredentialsProvider } from "@vercel/functions/oidc";
import { attachDatabasePool } from "@vercel/functions";
import { Signer } from "@aws-sdk/rds-signer";
import { ClientBase, Pool } from "pg";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getRequiredNumberEnv(name: string): number {
  const value = Number(getRequiredEnv(name));
  if (Number.isNaN(value)) {
    throw new Error(`Invalid numeric environment variable: ${name}`);
  }
  return value;
}

function getDbPassword() {
  if (process.env.PGPASSWORD) {
    return process.env.PGPASSWORD;
  }

  const signer = new Signer({
    hostname: getRequiredEnv("PGHOST"),
    port: getRequiredNumberEnv("PGPORT"),
    username: getRequiredEnv("PGUSER"),
    region: getRequiredEnv("AWS_REGION"),
    credentials: awsCredentialsProvider({
      roleArn: getRequiredEnv("AWS_ROLE_ARN"),
      clientConfig: { region: getRequiredEnv("AWS_REGION") },
    }),
  });

  return signer.getAuthToken();
}

const poolConfig: any = {
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  database: process.env.PGDATABASE || "postgres",
  password: getDbPassword,
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