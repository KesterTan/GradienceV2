"use client"

import { AppHeader } from "@/components/app-header"
import { GradingPage } from "@/components/grading-page"
import { HomePage } from "@/components/home-page"
import { RubricPage } from "@/components/rubric-page"
import { UploadPage } from "@/components/upload-page"
import { GradingProvider, useGrading } from "@/lib/grading-context"

type AuthenticatedUser = {
  name?: string
  email?: string
  picture?: string
}

function PageRouter({ user }: { user: AuthenticatedUser }) {
  const { currentPage } = useGrading()

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <AppHeader user={user} />
      {currentPage === "home" && <HomePage />}
      {currentPage === "upload" && <UploadPage />}
      {currentPage === "rubric" && <RubricPage />}
      {currentPage === "grading" && <GradingPage />}
    </div>
  )
}

export function ProtectedAppShell({ user }: { user: AuthenticatedUser }) {
  return (
    <GradingProvider>
      <PageRouter user={user} />
    </GradingProvider>
  )
}
