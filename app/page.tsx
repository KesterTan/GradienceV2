import { redirect } from "next/navigation"
import { requireAppUser } from "@/lib/current-user"

export default async function RootPage() {
  await requireAppUser()
  redirect("/courses")
}
