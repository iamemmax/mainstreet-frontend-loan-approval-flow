import { z } from "zod"
import { mockRequest } from "@/mocks/transport"
import { getApplication, listApplications } from "@/mocks/handlers/applications"
import {
  adjustOfferTerms,
  createApplication,
  decideOnApplication,
  myWork,
  offerView,
  respondToOffer,
  runVerification,
  saveAssessment,
  transitionApplication,
  type AssessmentInput,
} from "@/mocks/handlers/actions"
import { findAccount } from "@/mocks/handlers/accounts"
import { updateDraft } from "@/mocks/handlers/drafts"
import { postMessage, reviewApplication } from "@/mocks/handlers/messages"
import { decisionInputSchema } from "@/features/workflow/schemas/workflow"
import type { DecisionInput } from "@/features/workflow/types"
import {
  applicationListItemSchema,
  applicationListParamsSchema,
  applicationListSchema,
  adjustOfferInputSchema,
  applicationSchema,
  customerAccountSchema,
  messageInputSchema,
  newApplicationInputSchema,
  offerViewSchema,
} from "../schemas/application"
import type {
  AdjustOfferInput,
  ApplicationListParams,
  ApplicationTransition,
  MessageInput,
  NewApplicationInput,
} from "../types"

export const applicationKeys = {
  all: ["applications"] as const,
  lists: () => [...applicationKeys.all, "list"] as const,
  list: (params: ApplicationListParams) => [...applicationKeys.lists(), params] as const,
  details: () => [...applicationKeys.all, "detail"] as const,
  detail: (id: string) => [...applicationKeys.details(), id] as const,
  myWork: () => [...applicationKeys.all, "my-work"] as const,
  offer: (token: string) => ["offer", token] as const,
  account: (accountNumber: string) => ["accounts", accountNumber] as const,
}

// Real backend: apiFetch(`/accounts/${accountNumber}`, { schema: customerAccountSchema })
export function fetchAccount(accountNumber: string) {
  return mockRequest(customerAccountSchema, ({ store, session }) => findAccount(store, session, accountNumber), {
    permission: "application:create",
  })
}

// Real backend: apiFetch("/applications", { schema: applicationListSchema, query: params })
export function fetchApplications(params: ApplicationListParams) {
  const parsed = applicationListParamsSchema.parse(params)
  return mockRequest(applicationListSchema, ({ store, session }) => listApplications(store, session, parsed), {
    permission: "application:view",
  })
}

// Real backend: apiFetch(`/applications/${id}`, { schema: applicationSchema })
export function fetchApplication(id: string) {
  return mockRequest(applicationSchema, ({ store, session }) => getApplication(store, session, id), {
    permission: "application:view",
  })
}

// Real backend: apiFetch("/applications", { method: "POST", body: input, schema: applicationSchema })
export function submitNewApplication(input: NewApplicationInput) {
  const body = newApplicationInputSchema.parse(input)
  return mockRequest(applicationSchema, ({ store, session }) => createApplication(store, session, body), {
    permission: "application:create",
  })
}

// Real backend: apiFetch(`/applications/${id}`, { method: "PUT", body: input, schema: applicationSchema })
export function saveDraft(id: string, input: NewApplicationInput) {
  const body = newApplicationInputSchema.parse(input)
  return mockRequest(applicationSchema, ({ store, session }) => updateDraft(store, session, id, body), {
    permission: "application:edit",
  })
}

// Real backend: apiFetch(`/applications/${id}/decisions`, { method: "POST", body: { ...input, pin }, schema: applicationSchema })
export function decideApplication(id: string, input: DecisionInput, pin: string) {
  const body = decisionInputSchema.parse(input)
  return mockRequest(applicationSchema, ({ store, session }) => decideOnApplication(store, session, id, body, pin), {
    permission: "approval:act",
  })
}

// Real backend: apiFetch(`/applications/${id}/transitions`, { method: "POST", body: { transition, pin }, schema: applicationSchema })
export function moveApplication(id: string, transition: ApplicationTransition, pin: string) {
  return mockRequest(applicationSchema, ({ store, session }) =>
    transitionApplication(store, session, id, transition, pin),
  )
}

// Real backend: apiFetch(`/applications/${id}/verification`, { method: "POST", body: { pin }, schema: applicationSchema })
export function runChecks(id: string, pin: string) {
  return mockRequest(applicationSchema, ({ store, session }) => runVerification(store, session, id, pin), {
    permission: "verification:run",
  })
}

// Real backend: apiFetch(`/applications/${id}/assessment`, { method: "PUT", body: { ...input, pin }, schema: applicationSchema })
export function submitAssessment(id: string, input: AssessmentInput, pin: string) {
  return mockRequest(applicationSchema, ({ store, session }) => saveAssessment(store, session, id, input, pin), {
    permission: "assessment:edit",
  })
}

// Real backend: apiFetch(`/applications/${id}/review`, { method: "POST", body: { ...input, pin }, schema: applicationSchema })
export function rejectOrReturn(id: string, input: DecisionInput, pin: string) {
  const body = decisionInputSchema.parse(input)
  return mockRequest(applicationSchema, ({ store, session }) => reviewApplication(store, session, id, body, pin))
}

// Real backend: apiFetch(`/applications/${id}/messages`, { method: "POST", body: input, schema: applicationSchema })
export function sendMessage(id: string, input: MessageInput) {
  const body = messageInputSchema.parse(input)
  return mockRequest(applicationSchema, ({ store, session }) => postMessage(store, session, id, body))
}

// Real backend: apiFetch(`/applications/${id}/offer-terms`, { method: "PUT", body: { ...input, pin }, schema: applicationSchema })
export function adjustOffer(id: string, input: AdjustOfferInput, pin: string) {
  const body = adjustOfferInputSchema.parse(input)
  // No role permission: whoever the application is with at its current step may adjust the offer.
  return mockRequest(applicationSchema, ({ store, session }) => adjustOfferTerms(store, session, id, body, pin))
}

export const myWorkItemSchema = applicationListItemSchema.extend({ onBehalfOfName: z.string().nullable() })
export const myWorkSchema = z.object({
  pending: z.array(myWorkItemSchema),
  delegated: z.array(myWorkItemSchema),
  returned: z.array(myWorkItemSchema),
  overdue: z.array(myWorkItemSchema),
})

// Real backend: apiFetch("/me/work", { schema: myWorkSchema })
export function fetchMyWork() {
  return mockRequest(myWorkSchema, ({ store, session }) => myWork(store, session), { permission: "approval:act" })
}

// Real backend: apiFetch(`/public/offers/${token}`, { schema: offerViewSchema })
export function fetchOffer(token: string) {
  return mockRequest(offerViewSchema, ({ store }) => offerView(store, token), { auth: false })
}

// Real backend: apiFetch(`/public/offers/${token}/response`, { method: "POST", body: { accept }, schema: offerViewSchema })
export function answerOffer(token: string, accept: boolean) {
  return mockRequest(offerViewSchema, ({ store }) => respondToOffer(store, token, accept), { auth: false })
}
