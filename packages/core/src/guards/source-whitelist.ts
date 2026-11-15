/**
 * Registered source domain whitelist (report §7.2 / §9.3).
 * Only URLs on these domains may be rendered to the user; any other link
 * returned by the model is stripped by the guards layer.
 */

export const SOURCE_DOMAIN_WHITELIST: ReadonlySet<string> = new Set([
  // CPCD / CAEP (China)
  "lca.cityghg.com",
  "www.caep.org.cn",
  // Agribalyse / ADEME / data.gouv.fr
  "data.ademe.fr",
  "doc.agribalyse.fr",
  "www.data.gouv.fr",
  // Climatiq
  "www.climatiq.io",
  "climatiq.io",
  // Open Food Facts
  "world.openfoodfacts.org",
  "images.openfoodfacts.org",
  // First-version factor sources registered in packages/data (sources.ts)
  "ourworldindata.org", // Poore & Nemecek 2018 OWID grapher mirror
  "nems.nih.gov", // NEMS PET bottled-water review (www.nems.nih.gov)
  "oregon.gov", // Franklin Associates / Oregon DEQ 2009 (www.oregon.gov)
  // Boavizta (reserved, not in first-version main path)
  "doc.api.boavizta.org",
  "github.com",
  // openLCA (factor cross-check reference only)
  "www.openlca.org",
  "openlca.org",
  "nexus.openlca.org",
]);

/** Extract the lowercased host (no protocol, no port, no path) from a URL. */
export function domainOf(url: string): string {
  const trimmed = url.trim();
  const withoutScheme = trimmed.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "");
  const hostPart = withoutScheme.split("/")[0] ?? "";
  const host = hostPart.split(":")[0] ?? "";
  return host.toLowerCase();
}

/** True when the URL host matches the whitelist or a registered subdomain. */
export function isRegisteredSourceUrl(url: string): boolean {
  const host = domainOf(url);
  if (!host) return false;
  for (const domain of SOURCE_DOMAIN_WHITELIST) {
    if (host === domain || host.endsWith(`.${domain}`)) return true;
  }
  return false;
}

/** Emission unit whitelist for result validation (report §7.4). */
export const EMISSION_UNIT_WHITELIST: ReadonlySet<string> = new Set([
  "kgCO2e",
  "gCO2e",
  "kg CO2e",
  "kgCO2e/meal",
  "kgCO2e/bottle",
  "kgCO2e/can",
  "kgCO2e/pack",
  "kgCO2e/item",
  "kgCO2e/g",
  "kgCO2e/ml",
  "kgCO2e/100 g",
]);
