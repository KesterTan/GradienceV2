import { formatInTimeZone, fromZonedTime } from "date-fns-tz"

export const PITTSBURGH_TZ = "America/New_York"

export function formatPittsburghTime(date: string | Date, formatStr: string): string {
  return formatInTimeZone(new Date(date), PITTSBURGH_TZ, formatStr)
}

export function pittsburghToUtcIso(date: string, time: string, endOfDayFallback = false): string {
  const normalizedTime = time?.trim()
  const t = normalizedTime ? normalizedTime : endOfDayFallback ? "23:59:59" : "00:00:00"
  return fromZonedTime(new Date(`${date}T${t}`), PITTSBURGH_TZ).toISOString()
}

export function toDateValuePittsburgh(iso: string): string {
  return formatInTimeZone(new Date(iso), PITTSBURGH_TZ, "yyyy-MM-dd")
}

export function toTimeValuePittsburgh(iso: string): string {
  return formatInTimeZone(new Date(iso), PITTSBURGH_TZ, "HH:mm")
}

export function pittsburghBoundaryMs(date: string, endOfDay = false): number {
  const t = endOfDay ? "23:59:59.999" : "00:00:00.000"
  return fromZonedTime(new Date(`${date}T${t}`), PITTSBURGH_TZ).getTime()
}
