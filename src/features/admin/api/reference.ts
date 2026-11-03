import { z } from "zod"
import { mockRequest } from "@/mocks/transport"
import { permissionSchema, userSchema } from "@/features/auth/schemas/user"
import { ApiError } from "@/lib/api/errors"
import { roleSchema, type Role } from "@/lib/rbac/roles"
import type { Permission } from "@/lib/rbac/permissions"
import { productSchema, referenceDataSchema } from "../schemas/reference"
import type { Product } from "../types"

export const referenceKeys = {
  all: ["reference"] as const,
  users: ["reference", "users"] as const,
  rolePermissions: ["reference", "role-permissions"] as const,
}

export function fetchReferenceData() {
  // Public: products and branches also power the customer site and loan calculator.
  return mockRequest(referenceDataSchema, ({ store }) => store.reference, { auth: false })
}

export function fetchUsers() {
  return mockRequest(z.array(userSchema), ({ store }) => store.users)
}

const rolePermissionsSchema = z.record(roleSchema, z.array(permissionSchema))

export function fetchRolePermissions() {
  return mockRequest(rolePermissionsSchema, ({ store }) => store.rolePermissions, { permission: "admin:users" })
}

// Real backend: apiFetch(`/admin/roles/${role}/permissions`, { method: "PUT", body: permissions })
export function saveRolePermissions(role: Role, permissions: Permission[]) {
  return mockRequest(
    rolePermissionsSchema,
    ({ store }) => {
      if (role === "admin" && !permissions.includes("admin:users")) {
        throw new ApiError(422, "lockout", "Administrators must keep user management, or nobody could restore access")
      }
      store.rolePermissions[role] = [...permissions]
      return store.rolePermissions
    },
    { permission: "admin:users" },
  )
}

// Real backend: apiFetch(`/admin/products/${id}`, { method: "PATCH", body: patch, schema: productSchema })
export function updateProduct(id: string, patch: Partial<Pick<Product, "active" | "monthlyRateBps">>) {
  return mockRequest(
    productSchema,
    ({ store }) => {
      const product = store.reference.products.find((p) => p.id === id)
      if (!product) throw new ApiError(404, "not_found", "Product not found")
      Object.assign(product, patch)
      return product
    },
    { permission: "admin:products" },
  )
}

export function updateUserStatus(id: string, status: "active" | "inactive") {
  return mockRequest(
    userSchema,
    ({ store, session }) => {
      const user = store.users.find((u) => u.id === id)
      if (!user) throw new ApiError(404, "not_found", "User not found")
      if (user.id === session.user.id) throw new ApiError(422, "self", "You cannot deactivate your own account")
      user.status = status
      return user
    },
    { permission: "admin:users" },
  )
}
