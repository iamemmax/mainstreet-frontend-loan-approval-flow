/**
 * Business sectors, and for each one what the business trades, makes or does. On the form the second
 * dropdown depends on the first, so the two always agree.
 */
export const BUSINESS_SECTORS = [
  {
    name: "Trading",
    activityLabel: "Commodity traded",
    activities: [
      "Foodstuff and groceries",
      "Building materials",
      "Phones and electronics",
      "Textiles and clothing",
      "Cosmetics and toiletries",
      "Auto parts",
      "Pharmaceuticals",
    ],
  },
  {
    name: "Services",
    activityLabel: "Service rendered",
    activities: [
      "Logistics and haulage",
      "Catering and events",
      "Salon and beauty",
      "Repairs and maintenance",
      "Cleaning",
      "Printing and branding",
      "Consulting",
    ],
  },
  {
    name: "Manufacturing",
    activityLabel: "Product made",
    activities: ["Food and beverages", "Packaging", "Furniture", "Plastics", "Garments", "Soap and detergents"],
  },
  {
    name: "Agriculture",
    activityLabel: "Produce",
    activities: ["Crop farming", "Poultry", "Fish farming", "Livestock", "Agro-processing"],
  },
  {
    name: "Hospitality",
    activityLabel: "Service rendered",
    activities: ["Restaurant", "Hotel and short-let", "Bar and lounge"],
  },
  {
    name: "Healthcare",
    activityLabel: "Service rendered",
    activities: ["Pharmacy", "Clinic", "Diagnostic laboratory"],
  },
  {
    name: "Education",
    activityLabel: "Service rendered",
    activities: ["School", "Training centre", "Tutoring"],
  },
  {
    name: "Construction",
    activityLabel: "Type of work",
    activities: ["Building contractor", "Electrical and plumbing", "Interior finishing"],
  },
] as const

export type BusinessSector = (typeof BUSINESS_SECTORS)[number]

/** The sector with this name, if it's one of ours. */
export function findSector(name: string | undefined): BusinessSector | undefined {
  return BUSINESS_SECTORS.find((sector) => sector.name === name)
}

/** Kinds of asset that can be pledged as collateral. */
export const COLLATERAL_TYPES = [
  "Vehicle",
  "Property",
  "Land",
  "Equipment",
  "Inventory",
  "Fixed deposit",
  "Shares",
  "Other",
] as const

/** How a guarantor or next of kin is related to the applicant. */
export const RELATIONSHIPS = [
  "Spouse",
  "Father",
  "Mother",
  "Brother",
  "Sister",
  "Son",
  "Daughter",
  "Uncle",
  "Aunt",
  "Cousin",
  "Friend",
  "Colleague",
  "Business partner",
  "Employer",
  "Other",
] as const

/** Most and fewest guarantors an application can have. */
export const GUARANTOR_LIMITS = { min: 2, max: 4 } as const

/** Most statements of account an SME can upload: one per bank, up to six banks. */
export const MAX_STATEMENTS = 6
