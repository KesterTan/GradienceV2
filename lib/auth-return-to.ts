const DEFAULT_BASE_URL = "http://localhost"

type ReturnToValue = string | string[] | undefined

type SafeReturnToOptions = {
  defaultPath?: string
  origin?: string
}

function normalizeReturnPath(url: URL) {
  return `${url.pathname}${url.search}${url.hash}`
}

export function getSafeReturnTo(
  value: ReturnToValue,
  { defaultPath = "/courses", origin }: SafeReturnToOptions = {},
) {
  const candidate = Array.isArray(value) ? value[0] : value
  const trimmed = candidate?.trim()

  if (!trimmed) {
    return defaultPath
  }

  if (trimmed.startsWith("/")) {
    if (trimmed.startsWith("//")) {
      return defaultPath
    }

    return normalizeReturnPath(new URL(trimmed, origin ?? DEFAULT_BASE_URL))
  }

  if (!origin) {
    return defaultPath
  }

  try {
    const requestedUrl = new URL(trimmed)
    const appUrl = new URL(origin)

    if (requestedUrl.origin !== appUrl.origin) {
      return defaultPath
    }

    return normalizeReturnPath(requestedUrl)
  } catch {
    return defaultPath
  }
}
