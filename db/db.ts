import { attachDatabasePool } from "@vercel/functions";
import { awsCredentialsProvider } from "@vercel/functions/oidc";
import { Signer } from "@aws-sdk/rds-signer";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { ClientBase, Pool } from "pg";

const isVercel = !!process.env.VERCEL;
const useIamAuth = process.env.USE_IAM_AUTH === "true";

function resolveSsl() {
  const rawMode = (process.env.PGSSLMODE || "").toLowerCase().trim();

  if (rawMode === "disable") return false;

  if (["require", "verify-ca", "verify-full", "allow", "prefer"].includes(rawMode)) {
    return { rejectUnauthorized: false };
  }

  return false;
}

const ssl = resolveSsl();

const credentials = isVercel
  ? awsCredentialsProvider({
      roleArn: process.env.AWS_ROLE_ARN,
      clientConfig: { region: process.env.AWS_REGION },
    })
  : defaultProvider();

const signer =
  useIamAuth
    ? new Signer({
        hostname: process.env.PGHOST!,
        port: Number(process.env.PGPORT || 5432),
        username: process.env.PGUSER!,
        region: process.env.AWS_REGION!,
        credentials,
      })
    : null;

export const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || "postgres",
  user: process.env.PGUSER,
  password: useIamAuth
    ? async () => {
        if (!signer) throw new Error("IAM auth enabled but signer is missing");
        return signer.getAuthToken();
      }
    : process.env.PGPASSWORD,
  ssl,
  max: 20,
});

attachDatabasePool(pool);

export async function query(sql: string, args: unknown[]) {
  return pool.query(sql, args);
}

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