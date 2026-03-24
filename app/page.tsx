import { redirect } from "next/navigation"
import { requireAppUser } from "@/lib/current-user"

export default async function RootPage() {
  const user = await requireAppUser()

  if (user.globalRole === "student") {
    redirect("/student/courses")
  }

  redirect("/courses")
}
