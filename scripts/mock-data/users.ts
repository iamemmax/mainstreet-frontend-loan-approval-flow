import type { User } from "@/features/auth/types"

const u = (
  id: string,
  staffId: string,
  name: string,
  role: User["role"],
  branchId: string,
  status: User["status"] = "active",
): User => ({
  id,
  staffId,
  name,
  email: `${name.toLowerCase().split(" ").join(".")}@mainstreetmfb.com`,
  role,
  branchId,
  status,
})

/** Fixed demo staff. IDs are stable so docs and tests can reference them. */
export const USERS: User[] = [
  u("u-ro-1", "ML-0412", "Adaeze Nwosu", "relationship_officer", "b-lis"),
  u("u-ro-2", "ML-0418", "Tunde Bakare", "relationship_officer", "b-ikj"),
  u("u-ro-3", "ML-0433", "Chinedu Eze", "relationship_officer", "b-wse"),
  u("u-ro-4", "ML-0447", "Fatima Abubakar", "relationship_officer", "b-kan"),
  u("u-ro-5", "ML-0451", "Efe Omoregie", "relationship_officer", "b-bnc"),
  u("u-ro-6", "ML-0460", "Kelechi Amadi", "relationship_officer", "b-phc"),
  u("u-ro-7", "ML-0466", "Temitope Ajayi", "relationship_officer", "b-ibd"),
  u("u-vo-1", "ML-0302", "Bisola Adeyemi", "verification_officer", "b-lis"),
  u("u-vo-2", "ML-0309", "Usman Garba", "verification_officer", "b-wse"),
  u("u-cm-1", "ML-0215", "Ngozi Okafor", "credit_manager", "b-lis"),
  u("u-cm-2", "ML-0221", "Ibrahim Bello", "credit_manager", "b-wse"),
  u("u-an-1", "ML-0240", "Yetunde Ogunleye", "credit_analyst", "b-lis"),
  u("u-an-2", "ML-0244", "Musa Danjuma", "credit_analyst", "b-wse"),
  u("u-hoc-1", "ML-0108", "Olumide Adebayo", "head_of_credit", "b-lis", "away"),
  u("u-fa-1", "ML-0101", "Aisha Mohammed", "final_approver", "b-lis"),
  u("u-fa-2", "ML-0102", "Chiamaka Okeke", "final_approver", "b-lis"),
  u("u-fa-3", "ML-0100", "Babatunde Fashola", "final_approver", "b-ikj"),
  u("u-fin-1", "ML-0520", "Emeka Obi", "finance_officer", "b-lis"),
  u("u-aud-1", "ML-0601", "Halima Yusuf", "auditor", "b-lis"),
  u("u-adm-1", "ML-0001", "Segun Afolabi", "admin", "b-lis"),
]
