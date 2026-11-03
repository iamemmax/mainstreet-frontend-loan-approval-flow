"""Writes the sample documents the demo opens in its viewer, into public/samples.

    python3 scripts/mock-data/sample-files.py

Plain PDFs (no dependencies) and one SVG for the ID card photo. Real deployments
serve the customer's own files from the bank's document store instead.
"""
import pathlib

OUT = pathlib.Path(__file__).resolve().parents[2] / "public" / "samples"
PLUM = (0.486, 0.122, 0.455)
INK = (0.11, 0.10, 0.12)
MUTED = (0.43, 0.41, 0.46)


def esc(s):
    return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


class Page:
    def __init__(self):
        self.ops = []

    def rect(self, x, y, w, h, rgb):
        self.ops.append(f"{rgb[0]} {rgb[1]} {rgb[2]} rg {x} {y} {w} {h} re f")

    def line(self, x1, y1, x2, rgb=(0.86, 0.85, 0.88), width=0.6):
        self.ops.append(f"{rgb[0]} {rgb[1]} {rgb[2]} RG {width} w {x1} {y1} m {x2} {y1} l S")

    def text(self, x, y, s, size=10, bold=False, rgb=INK):
        font = "F2" if bold else "F1"
        self.ops.append(f"BT {rgb[0]} {rgb[1]} {rgb[2]} rg /{font} {size} Tf {x} {y} Td ({esc(s)}) Tj ET")


def write_pdf(path, pages):
    objs = []
    add = lambda body: objs.append(body) or len(objs)
    f1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    f2 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")
    pages_id = len(objs) + 1 + 2 * len(pages)
    kids = []
    for p in pages:
        stream = "\n".join(p.ops).encode("latin-1")
        c = add(f"<< /Length {len(stream)} >>\nstream\n".encode("latin-1") + stream + b"\nendstream")
        kids.append(add(f"<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 {f1} 0 R /F2 {f2} 0 R >> >> /Contents {c} 0 R >>"))
    add(f"<< /Type /Pages /Kids [{' '.join(f'{k} 0 R' for k in kids)}] /Count {len(kids)} >>")
    catalog = add(f"<< /Type /Catalog /Pages {pages_id} 0 R >>")
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, body in enumerate(objs, 1):
        offsets.append(len(out))
        data = body if isinstance(body, bytes) else body.encode("latin-1")
        out += f"{i} 0 obj\n".encode() + data + b"\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode()
    for o in offsets:
        out += f"{o:010d} 00000 n \n".encode()
    out += f"trailer\n<< /Size {len(objs) + 1} /Root {catalog} 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    path.write_bytes(bytes(out))


def header(p, title, subtitle):
    p.rect(0, 782, 595, 60, PLUM)
    p.text(40, 812, title, 18, True, (1, 1, 1))
    p.text(40, 794, subtitle, 9, False, (0.95, 0.9, 0.95))


def table(p, top, cols, rows):
    x = 40
    widths = [w for _, w in cols]
    p.rect(40, top - 6, 515, 22, (0.95, 0.94, 0.96))
    for (label, w) in cols:
        p.text(x + 6, top + 2, label, 9, True, MUTED)
        x += w
    y = top - 24
    for r in rows:
        x = 40
        for v, w in zip(r, widths):
            p.text(x + 6, y, v, 9)
            x += w
        p.line(40, y - 7, 555)
        y -= 22
    return y


def bank_statement():
    pages = []
    rows = [(f"{d:02d} Oct 2026", desc, dr, cr, f"{bal:,}.00") for d, desc, dr, cr, bal in [
        (1, "Opening balance", "", "", 412000), (2, "Salary - employer credit", "", "380,000.00", 792000), (3, "POS purchase - Shoprite", "18,450.00", "", 773550),
        (5, "Transfer to savings", "50,000.00", "", 723550), (8, "Electricity token", "15,000.00", "", 708550), (11, "Transfer from A. Bello", "", "25,000.00", 733550),
        (14, "School fees", "120,000.00", "", 613550), (17, "Airtime", "5,000.00", "", 608550), (20, "POS purchase - market", "32,800.00", "", 575750),
        (23, "Transfer to landlord", "150,000.00", "", 425750), (26, "Fuel", "24,000.00", "", 401750), (29, "Interest credit", "", "1,240.00", 402990)]]
    cols = [("Date", 90), ("Description", 200), ("Debit", 75), ("Credit", 75), ("Balance", 75)]
    for i, chunk in enumerate([rows[:7], rows[7:]]):
        p = Page()
        header(p, "Statement of account", f"Account 01*****482 · 1 Oct - 31 Oct 2026 · page {i + 1} of 2")
        p.text(40, 750, "Account holder", 9, False, MUTED)
        p.text(40, 736, "As named on the application", 11, True)
        p.text(330, 750, "Closing balance", 9, False, MUTED)
        p.text(330, 736, "NGN 402,990.00", 11, True)
        table(p, 690, cols, chunk)
        pages.append(p)
    return pages


def simple(title, subtitle, sections):
    p = Page()
    header(p, title, subtitle)
    y = 740
    for heading, items in sections:
        p.text(40, y, heading, 11, True, PLUM)
        y -= 22
        for k, v in items:
            p.text(40, y, k, 10, False, MUTED)
            p.text(230, y, v, 10)
            p.line(40, y - 8, 555)
            y -= 24
        y -= 14
    return [p]


def guarantor_form():
    [p] = simple("Guarantor form", "Personal guarantee for a loan facility", [
        ("Guarantor", [("Full name", "As written by the guarantor"), ("Relationship to applicant", "Brother"), ("Phone", "0803 000 0000"), ("Occupation", "Trader")]),
        ("Undertaking", [("Amount guaranteed", "Up to the full facility and interest"), ("Valid until", "The loan is fully repaid")]),
    ])
    p.text(40, 300, "Signature", 10, False, MUTED)
    p.ops.append("0.11 0.10 0.12 RG 1.4 w 40 330 m 70 352 l 90 322 l 112 350 l 140 326 l 170 344 S")
    p.line(40, 318, 260, INK)
    p.text(330, 300, "Date: 27 Oct 2026", 10)
    return [p]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    files = {
        "bank-statement-6-months.pdf": bank_statement(),
        "payslip-last-3-months.pdf": simple("Payslip", "September 2026", [
            ("Earnings", [("Basic salary", "NGN 280,000.00"), ("Housing allowance", "NGN 60,000.00"), ("Transport allowance", "NGN 40,000.00")]),
            ("Deductions", [("PAYE tax", "NGN 31,200.00"), ("Pension (8%)", "NGN 22,400.00")]),
            ("Net pay", [("Paid to account 01*****482", "NGN 326,400.00")]),
        ]),
        "signed-guarantor-form.pdf": guarantor_form(),
        "cac-certificate-and-status-report.pdf": simple("Certificate of incorporation", "Corporate Affairs Commission · status report", [
            ("Company", [("Registered name", "As on the application"), ("RC number", "RC 1798835"), ("Date of incorporation", "14 Mar 2006"), ("Status", "Active")]),
            ("Directors", [("Director 1", "Principal promoter"), ("Director 2", "Company secretary")]),
        ]),
        "management-accounts-fy2025.pdf": simple("Management accounts", "Financial year 2025 · unaudited", [
            ("Income statement", [("Revenue", "NGN 664,200,000"), ("Cost of sales", "NGN 431,700,000"), ("Gross profit", "NGN 232,500,000"), ("Operating expenses", "NGN 118,900,000"), ("Net profit", "NGN 113,600,000")]),
            ("Balance sheet", [("Total assets", "NGN 402,000,000"), ("Total liabilities", "NGN 151,000,000")]),
        ]),
        "utility-bill.pdf": simple("Electricity bill", "Prepaid meter · October 2026", [("Customer", [("Service address", "As on the application"), ("Meter number", "4500 1123 987"), ("Amount paid", "NGN 15,000.00")])]),
    }
    for name, pages in files.items():
        write_pdf(OUT / name, pages)
    (OUT / "national-id.svg").write_text(ID_SVG)
    faces = OUT / "faces"
    faces.mkdir(exist_ok=True)
    for i, person in enumerate(PEOPLE, 1):
        (faces / f"person-{i}-selfie.svg").write_text(portrait(person, selfie=True))
        (faces / f"person-{i}-bvn.svg").write_text(portrait(person, selfie=False))
    print("wrote", ", ".join(sorted([*files, "national-id.svg"])), f"and {len(PEOPLE) * 2} portraits")


# Illustrated portraits standing in for the selfie captured at application and the
# photo held on the BVN record. Drawn, not photographs: no real person is depicted.
PEOPLE = [
    {"skin": "#8d5524", "hair": "#1b1b1b", "wrap": "#b3243a", "top": "#2f4b7c"},
    {"skin": "#6b3e26", "hair": "#2b1d14", "wrap": None, "top": "#3d6b4f"},
    {"skin": "#a0663b", "hair": "#121212", "wrap": "#c9a227", "top": "#5a2d5f"},
    {"skin": "#5a321c", "hair": "#0e0e0e", "wrap": None, "top": "#1f3d5a"},
    {"skin": "#7a4a2a", "hair": "#1d1a17", "wrap": "#2e6f6a", "top": "#7a3b2e"},
    {"skin": "#9c6236", "hair": "#191512", "wrap": None, "top": "#444a57"},
]


def portrait(p, selfie):
    # Selfies: warm, uneven indoor light and a closer, slightly tilted crop. BVN photos: flat studio background, centred.
    bg = '<rect width="300" height="300" fill="#3a2a22"/><circle cx="250" cy="40" r="120" fill="#7a5a3a" opacity=".45"/>' if selfie else '<rect width="300" height="300" fill="#dfe6ee"/>'
    tilt = 'transform="rotate(-6 150 170) translate(0 -8) scale(1.08) translate(-11 0)"' if selfie else ""
    hair = (
        f'<path d="M92 120c0-50 30-78 58-78s58 28 58 78c-8-16-20-30-58-30s-50 14-58 30z" fill="{p["wrap"]}"/>'
        f'<path d="M86 118c18-14 40-20 64-20s46 6 64 20c-4-60-34-82-64-82s-60 22-64 82z" fill="{p["wrap"]}" opacity=".85"/>'
        if p["wrap"]
        else f'<path d="M96 130c-6-60 22-88 54-88s60 28 54 88c-6-22-24-36-54-36s-48 14-54 36z" fill="{p["hair"]}"/>'
    )
    shade = "#000" if selfie else "#fff"
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="600" height="600">
  {bg}
  <g {tilt}>
    <path d="M40 300c8-62 52-92 110-92s102 30 110 92z" fill="{p["top"]}"/>
    <rect x="132" y="182" width="36" height="34" rx="12" fill="{p["skin"]}"/>
    <ellipse cx="150" cy="140" rx="54" ry="64" fill="{p["skin"]}"/>
    {hair}
    <ellipse cx="128" cy="140" rx="6" ry="4" fill="#1a1110"/><ellipse cx="172" cy="140" rx="6" ry="4" fill="#1a1110"/>
    <path d="M118 128q10-6 20 0M162 128q10-6 20 0" stroke="#1a1110" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M150 146q-6 16 0 20" stroke="#000" stroke-opacity=".25" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M136 178q14 9 28 0" stroke="#5a1f24" stroke-width="5" fill="none" stroke-linecap="round"/>
    <ellipse cx="150" cy="140" rx="54" ry="64" fill="{shade}" opacity="{".18" if selfie else ".04"}"/>
  </g>
</svg>
"""


ID_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 856 540" width="856" height="540">
  <rect width="856" height="540" rx="36" fill="#f6f4f7"/>
  <rect width="856" height="96" rx="36" fill="#7c1f74"/><rect y="60" width="856" height="36" fill="#7c1f74"/>
  <text x="48" y="62" font-family="Helvetica, Arial" font-size="30" font-weight="700" fill="#fff">NATIONAL IDENTITY CARD</text>
  <rect x="48" y="132" width="210" height="260" rx="16" fill="#e4e0e7"/>
  <circle cx="153" cy="225" r="54" fill="#9e99a5"/><path d="M68 392c10-80 50-110 85-110s75 30 85 110z" fill="#9e99a5"/>
  <g font-family="Helvetica, Arial" fill="#1c1a1f">
    <text x="300" y="160" font-size="18" fill="#6e6975">Surname / Given names</text><text x="300" y="192" font-size="28" font-weight="700">AS ON THE APPLICATION</text>
    <text x="300" y="240" font-size="18" fill="#6e6975">NIN</text><text x="300" y="270" font-size="26" font-family="Menlo, monospace">•••• ••• 4521</text>
    <text x="300" y="318" font-size="18" fill="#6e6975">Date of birth</text><text x="300" y="346" font-size="24">01 JAN 1990</text>
    <text x="560" y="318" font-size="18" fill="#6e6975">Sex</text><text x="560" y="346" font-size="24">F</text>
  </g>
  <g fill="#1c1a1f">""" + "".join(f'<rect x="{300 + i * 9}" y="420" width="{2 if i % 3 else 5}" height="60"/>' for i in range(52)) + """</g>
</svg>
"""

if __name__ == "__main__":
    main()
