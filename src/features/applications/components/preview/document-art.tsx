import type { ApplicationDocument } from "../../types"

type DocType = ApplicationDocument["type"]

/** Accent colour for each document's header band. */
const ACCENT: Record<DocType, string> = {
  id_card: "fill-primary",
  bank_statement: "fill-info",
  payslip: "fill-success",
  utility_bill: "fill-warning",
  cac_certificate: "fill-chart-3",
  management_accounts: "fill-chart-2",
  collateral: "fill-muted-foreground",
  guarantor_form: "fill-primary",
  other: "fill-muted-foreground",
}

const Lines = ({ x, y, rows, width = 92 }: { x: number; y: number; rows: number; width?: number }) => (
  <g className="fill-muted-foreground/25">
    {Array.from({ length: rows }, (_, i) => (
      <rect key={i} x={x} y={y + i * 9} width={i % 3 === 2 ? width * 0.6 : width} height={3.5} rx={1.75} />
    ))}
  </g>
)

/**
 * A drawn preview of an uploaded document. The file itself stays with the bank's
 * document store; this shows what kind of document it is at a glance.
 */
export function DocumentArt({ type, name, className }: { type: DocType; name: string; className?: string }) {
  if (type === "id_card") {
    return (
      <svg viewBox="0 0 160 120" className={className} aria-hidden>
        <rect width="160" height="120" className="fill-muted" />
        <rect x="18" y="22" width="124" height="78" rx="8" className="fill-card stroke-border" />
        <rect x="18" y="22" width="124" height="16" rx="8" className={ACCENT[type]} />
        <rect x="18" y="32" width="124" height="6" className={ACCENT[type]} />
        <rect x="28" y="46" width="32" height="40" rx="4" className="fill-muted" />
        <circle cx="44" cy="60" r="8" className="fill-muted-foreground/35" />
        <path d="M32 84c2-9 7-13 12-13s10 4 12 13z" className="fill-muted-foreground/35" />
        <text x="68" y="54" className="fill-foreground" fontSize="7" fontWeight="600">
          {name.length > 18 ? `${name.slice(0, 17)}…` : name}
        </text>
        <Lines x={68} y={62} rows={3} width={62} />
        <g className="fill-foreground/70">
          {Array.from({ length: 22 }, (_, i) => (
            <rect key={i} x={68 + i * 3} y="88" width={i % 3 ? 1 : 2} height="6" />
          ))}
        </g>
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 160 120" className={className} aria-hidden>
      <rect width="160" height="120" className="fill-muted" />
      <rect x="40" y="10" width="80" height="104" rx="4" className="fill-card stroke-border" />
      <rect x="40" y="10" width="80" height="12" rx="4" className={ACCENT[type]} />
      <rect x="40" y="18" width="80" height="4" className={ACCENT[type]} />
      {type === "bank_statement" || type === "management_accounts" ? (
        <>
          <Lines x={48} y={30} rows={2} width={64} />
          <polyline
            points="48,76 60,66 72,70 84,56 96,60 112,44"
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={type === "bank_statement" ? "stroke-info" : "stroke-chart-2"}
          />
          <Lines x={48} y={86} rows={2} width={64} />
        </>
      ) : type === "payslip" ? (
        <>
          <Lines x={48} y={30} rows={2} width={64} />
          <g className="stroke-border" strokeWidth="1">
            {[50, 60, 70, 80, 90].map((y) => (
              <line key={y} x1="48" x2="112" y1={y} y2={y} />
            ))}
            <line x1="88" x2="88" y1="50" y2="90" />
          </g>
          <rect x="92" y="94" width="20" height="6" rx="2" className="fill-success/60" />
        </>
      ) : type === "guarantor_form" ? (
        <>
          <Lines x={48} y={30} rows={5} width={64} />
          <path
            d="M50 92c6-8 9 4 14-2s7-6 10 0 6 2 9-1"
            fill="none"
            strokeWidth="1.8"
            strokeLinecap="round"
            className="stroke-foreground/70"
          />
          <line x1="48" x2="100" y1="98" y2="98" strokeWidth="1" className="stroke-border" />
        </>
      ) : type === "cac_certificate" ? (
        <>
          <Lines x={48} y={32} rows={4} width={64} />
          <circle cx="80" cy="86" r="11" className="fill-chart-3/25 stroke-chart-3" strokeWidth="1.5" />
          <circle cx="80" cy="86" r="6" className="fill-chart-3/50" />
        </>
      ) : type === "collateral" ? (
        <>
          <path d="M60 70l20-16 20 16v22H60z" className="fill-muted stroke-muted-foreground/50" strokeWidth="1.5" />
          <rect x="74" y="78" width="12" height="14" className="fill-muted-foreground/30" />
          <Lines x={48} y={30} rows={2} width={64} />
        </>
      ) : (
        <Lines x={48} y={32} rows={7} width={64} />
      )}
    </svg>
  )
}
