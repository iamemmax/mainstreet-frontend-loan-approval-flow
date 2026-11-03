"use client"

import type { Application } from "../../../types"
import { IdentityPhotos } from "../../identity/identity-photos"
import { RailSection } from "./ui"

export function IdentityCheck({ app, name }: { app: Application; name: string }) {
  return (
    <RailSection title="Identity check">
      <IdentityPhotos app={app} name={name} />
    </RailSection>
  )
}
