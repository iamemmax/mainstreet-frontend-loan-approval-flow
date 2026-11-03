/** Where users land after sign-in. Every staff role can view applications, so all start on the dashboard. */
export function landingPathFor(): string {
  return "/dashboard"
}
