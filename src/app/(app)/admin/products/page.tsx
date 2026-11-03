import type { Metadata } from "next"
import { ProductsAdmin } from "@/features/admin/components/products-admin"

export const metadata: Metadata = { title: "Products" }

export default function Page() {
  return <ProductsAdmin />
}
