import { writeFile, mkdir } from "fs/promises"
import path from "path"

/**
 * Uploads a file to storage and returns its public URL.
 *
 * Development: writes to public/uploads/ on local disk.
 * Production:  swap this implementation for S3 PutObjectCommand —
 *              no other files need to change.
 *
 * @param file     The file to store.
 * @param filePath Relative path within the storage root, e.g.
 *                 "submissions/{courseId}/{assignmentId}/{userId}/{attemptNumber}.pdf"
 * @returns        The public URL at which the file is retrievable.
 */
export async function uploadFile(
  file: File,
  filePath: string
): Promise<{ url: string }> {
  const uploadsRoot = path.join(process.cwd(), "public", "uploads")
  const fullPath = path.join(uploadsRoot, filePath)

  // Ensure the directory exists
  await mkdir(path.dirname(fullPath), { recursive: true })

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(fullPath, buffer)

  // Return the path relative to public/ so Next.js serves it statically
  const url = `/uploads/${filePath}`
  return { url }
}
