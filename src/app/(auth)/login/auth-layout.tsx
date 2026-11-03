import { CheckCircle2, KeyRound, ScrollText, ShieldCheck, type LucideIcon } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import { BrandMark } from "@/components/shell/app-sidebar"
import { BRAND } from "@/lib/brand"

const POINTS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ShieldCheck,
    title: "Maker-checker approvals",
    body: "No one approves their own file. Every stage is a different person.",
  },
  {
    icon: KeyRound,
    title: "Signed with your PIN",
    body: "Sign-in, decisions and every change are confirmed with your PIN.",
  },
  { icon: ScrollText, title: "A full audit trail", body: "Who did what, and when, on every application." },
]

/** A small, realistic glimpse of the product: an approval being signed. Decorative. */
function PreviewCard() {
  return (
    <div
      aria-hidden
      className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-2xl backdrop-blur-md"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[11px] text-white/50">ML-SME-2610-01232</div>
          <div className="text-sm font-semibold text-white">Gracefield Global Resources</div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-accent/15 px-2.5 py-1 text-[11px] font-semibold text-brand-accent">
          <CheckCircle2 className="size-3.5" /> Approved
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between border-t border-white/10 pt-3">
        <div>
          <div className="text-[11px] text-white/50">Loan</div>
          <div className="tabular text-lg font-semibold text-white">₦85,000,000</div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-white/50">Committee</div>
          <div className="mt-1 flex gap-1">
            <span className="h-1.5 w-7 rounded-full bg-brand-accent" />
            <span className="h-1.5 w-7 rounded-full bg-brand-accent" />
            <span className="h-1.5 w-7 rounded-full bg-white/20" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    // On desktop the brand panel stays put and only the sign-in column scrolls.
    <div className="grid min-h-svh lg:h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:overflow-hidden">
      <aside className="relative hidden overflow-hidden bg-sidebar p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        {/* Soft plum and orchid glows, and a faint grid, behind the content. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -left-40 size-[34rem] rounded-full bg-primary/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -bottom-48 size-[30rem] rounded-full bg-chart-2/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
        />

        <Link href="/" className="relative flex items-center gap-3.5">
          <BrandMark className="h-11" />
          <div className="leading-tight">
            <div className="text-[15px] font-semibold">{BRAND.bankShortName}</div>
            <div className="text-xs tracking-wide text-white/55 uppercase">{BRAND.productName}</div>
          </div>
        </Link>

        <div className="relative max-w-lg space-y-8">
          <div className="space-y-4">
            <h1 className="text-[2.6rem] leading-[1.1] font-semibold tracking-tight text-balance">
              From application to accepted offer, <span className="text-brand-accent">in one workflow.</span>
            </h1>
            <p className="text-[15px] leading-relaxed text-white/65 text-pretty">
              Intake, verification, credit assessment and a configurable approval chain for Retail and SME lending.
            </p>
          </div>
          <ul className="space-y-5">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-brand-accent ring-1 ring-white/10">
                  <p.icon className="size-[18px]" aria-hidden />
                </span>
                <div>
                  <div className="text-sm font-semibold">{p.title}</div>
                  <div className="text-[13px] text-white/55">{p.body}</div>
                </div>
              </li>
            ))}
          </ul>
          <PreviewCard />
        </div>

        <p className="relative text-xs text-white/40">
          {BRAND.bankName} · Internal use only · Powered by {BRAND.vendor}
        </p>
      </aside>

      <main className="flex flex-col px-4 py-8 sm:px-10 lg:overflow-y-auto">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 lg:invisible">
            <BrandMark />
            <span className="text-sm font-semibold">{BRAND.bankShortName}</span>
          </Link>
          <p className="text-[13px] text-muted-foreground">
            Trouble signing in? <span className="font-medium text-foreground">Contact IT support</span>
          </p>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Staff access only. Never share your password or PIN, including with IT.
        </p>
      </main>
    </div>
  )
}
