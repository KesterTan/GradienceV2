import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { fromTemporaryCredentials } from "@aws-sdk/credential-providers"
import { awsCredentialsProvider } from "@vercel/functions/oidc"

let s3Client: S3Client | null = null
let oidcWarningShown = false

function getS3StaticCredentials() {
  const accessKeyId = process.env.S3_SUBMISSIONS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey =
    process.env.S3_SUBMISSIONS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY
  const sessionToken = process.env.S3_SUBMISSIONS_SESSION_TOKEN || process.env.AWS_SESSION_TOKEN

  if (!accessKeyId && !secretAccessKey) {
    return null
  }

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "Incomplete AWS static credentials for S3 submissions. Set both access key id and secret access key.",
    )
  }

  return {
    accessKeyId,
    secretAccessKey,
    ...(sessionToken ? { sessionToken } : {}),
  }
}

function getS3Region() {
  return process.env.S3_SUBMISSIONS_REGION || process.env.AWS_REGION
}

function getS3RoleArn() {
  return process.env.S3_SUBMISSIONS_ROLE_ARN || process.env.AWS_ROLE_ARN
}

function shouldUseVercelOidc(roleArn: string | undefined) {
  if (!roleArn) return false

  const disableOidc = (process.env.S3_SUBMISSIONS_DISABLE_OIDC || "").toLowerCase()
  if (disableOidc === "1" || disableOidc === "true" || disableOidc === "yes") {
    return false
  }

  const hasVercelOidcToken = Boolean(process.env.VERCEL_OIDC_TOKEN)
  const enableLocalToken = (process.env.S3_SUBMISSIONS_ENABLE_LOCAL_VERCEL_OIDC || "").toLowerCase()
  const localTokenEnabled =
    enableLocalToken === "1" ||
    enableLocalToken === "true" ||
    enableLocalToken === "yes"

  // Native Vercel runtime.
  if (process.env.VERCEL === "1") {
    return true
  }

  // Optional local mode for debugging with a pulled token.
  return hasVercelOidcToken && localTokenEnabled
}

function getS3Bucket() {
  const bucket = process.env.S3_SUBMISSIONS_BUCKET
  if (!bucket) {
    throw new Error("Missing S3_SUBMISSIONS_BUCKET environment variable")
  }
  return bucket
}

function getS3Client() {
  if (s3Client) return s3Client

  const region = getS3Region()
  if (!region) {
    throw new Error("Missing AWS region for S3 submissions")
  }

  const roleArn = getS3RoleArn()
  const staticCredentials = getS3StaticCredentials()
  const useOidc = shouldUseVercelOidc(roleArn)

  if (roleArn && !staticCredentials && !useOidc && !oidcWarningShown) {
    oidcWarningShown = true
    console.warn(
      "S3 role ARN is configured but Vercel OIDC is not active. Attempting STS AssumeRole via local/default AWS credentials.",
    )
  }

  s3Client = new S3Client({
    region,
    ...(staticCredentials
      ? {
          credentials: staticCredentials,
        }
      : roleArn
      ? {
          credentials: useOidc
            ? awsCredentialsProvider({
                roleArn,
                clientConfig: { region },
              })
            : fromTemporaryCredentials({
                clientConfig: { region },
                params: {
                  RoleArn: roleArn,
                  RoleSessionName: "gradience-s3-submissions",
                },
              }),
        }
      : {}),
  })

  return s3Client
}

function isS3ObjectNotFoundError(error: unknown) {
  if (!error || typeof error !== "object") return false

  const maybeError = error as {
    name?: string
    Code?: string
    code?: string
    $metadata?: { httpStatusCode?: number }
  }

  return (
    maybeError.name === "NoSuchKey" ||
    maybeError.Code === "NoSuchKey" ||
    maybeError.code === "NoSuchKey" ||
    maybeError.$metadata?.httpStatusCode === 404
  )
}

export function buildSubmissionS3Url(objectKey: string) {
  return `s3://${getS3Bucket()}/${objectKey}`
}

export function buildRubricS3ObjectKey({
  courseId,
  assignmentId,
}: {
  courseId: number
  assignmentId: number
}) {
  return `rubrics/assessments/${courseId}/${assignmentId}/rubric.json`
}

export function buildRubricS3Url({
  courseId,
  assignmentId,
}: {
  courseId: number
  assignmentId: number
}) {
  return buildSubmissionS3Url(buildRubricS3ObjectKey({ courseId, assignmentId }))
}

export function parseSubmissionS3Url(fileUrl: string) {
  if (!fileUrl.startsWith("s3://")) {
    return null
  }

  const value = fileUrl.slice("s3://".length)
  const firstSlash = value.indexOf("/")
  if (firstSlash <= 0 || firstSlash === value.length - 1) {
    return null
  }

  const bucket = value.slice(0, firstSlash)
  const key = value.slice(firstSlash + 1)
  return { bucket, key }
}

export async function uploadSubmissionPdfToS3({
  objectKey,
  body,
}: {
  objectKey: string
  body: Buffer
}) {
  const bucket = getS3Bucket()
  const client = getS3Client()

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: body,
      ContentType: "application/pdf",
    }),
  )
}

export async function uploadRubricJsonToS3({
  objectKey,
  rubricJson,
}: {
  objectKey: string
  rubricJson: unknown
}) {
  const bucket = getS3Bucket()
  const client = getS3Client()

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: JSON.stringify(rubricJson, null, 2),
      ContentType: "application/json",
    }),
  )
}

export async function loadSubmissionPdfFromS3(fileUrl: string) {
  const parsed = parseSubmissionS3Url(fileUrl)
  if (!parsed) {
    return null
  }

  const client = getS3Client()
  let result
  try {
    result = await client.send(
      new GetObjectCommand({
        Bucket: parsed.bucket,
        Key: parsed.key,
      }),
    )
  } catch (error) {
    if (isS3ObjectNotFoundError(error)) {
      return null
    }
    throw error
  }

  const body = result.Body
  if (!body) {
    return null
  }

  const bytes = await body.transformToByteArray()
  return Buffer.from(bytes)
}

export async function loadRubricJsonFromS3(fileUrl: string) {
  const parsed = parseSubmissionS3Url(fileUrl)
  if (!parsed) {
    return null
  }

  const client = getS3Client()
  let result
  try {
    result = await client.send(
      new GetObjectCommand({
        Bucket: parsed.bucket,
        Key: parsed.key,
      }),
    )
  } catch (error) {
    if (isS3ObjectNotFoundError(error)) {
      return null
    }
    throw error
  }

  const body = result.Body
  if (!body) {
    return null
  }

  const bytes = await body.transformToByteArray()
  const text = Buffer.from(bytes).toString("utf8")

  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
