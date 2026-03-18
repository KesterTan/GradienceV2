"use client"

import type { ReactNode } from "react"
import { Auth0Provider as SDKAuth0Provider } from "@auth0/nextjs-auth0/client"

export function Auth0Provider({ children }: { children: ReactNode }) {
  return <SDKAuth0Provider>{children}</SDKAuth0Provider>
}
