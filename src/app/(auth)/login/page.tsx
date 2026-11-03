import type { Metadata } from "next"
import { Suspense } from "react"
import { SignInFlow } from "@/features/auth/components/sign-in/sign-in-flow"
import { AuthLayout } from "./auth-layout"

export const metadata: Metadata = { title: "Sign in" }

export default function LoginPage() {
  return (
    <AuthLayout>
      <Suspense>
        <SignInFlow />
      </Suspense>
    </AuthLayout>
  )
}
