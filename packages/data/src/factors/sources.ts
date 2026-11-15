/**
 * Public source registry for the narrow first-version factor library.
 *
 * Provenance rules (report §9.3):
 * - Poore & Nemecek (2018), Science: global-average per-kg food product GHG,
 *   mirrored by the OWID grapher dataset; used for agriculture-stage factors.
 * - PET bottled-water LCA review (NEMS-hosted, cites Franklin Associates 2011,
 *   Gleick & Cooley 2009, Gironi & Piemonte 2010): stage-level bottle burdens.
 * - Franklin Associates / Oregon DEQ 2009: drinking-water systems LCA, used
 *   only for the tap-water reference factor; its license/terms were not
 *   individually verified and are flagged "待核实".
 * - Agribalyse 3.2 (ADEME, Etalab Open Licence 2.0): open European food LCI,
 *   kept as a documented cross-reference; no per-ingredient row was extracted
 *   in this version.
 * - CPCD (China Products Carbon Footprint Factors Database): Chinese local
 *   factors; batch/API terms could not be confirmed, so no CPCD numeric factor
 *   is shipped; geography caveats are recorded in remarks.
 * - Open Food Facts: product attributes only, never an emission factor source.
 */

export interface SourceRecord {
  source_name: string;
  source_url: string;
  source_publisher: string;
  license: string;
  attribution: string;
  version: string;
}

/** Poore & Nemecek 2018 meta-analysis, OWID grapher mirror of the per-kg dataset. */
export const SOURCE_POORE_NEMECEK_2018: SourceRecord = {
  source_name: "Poore & Nemecek (2018), Science 360:987–992; OWID grapher mirror",
  source_url: "https://ourworldindata.org/grapher/ghg-per-kg-poore.csv",
  source_publisher: "Joseph Poore, Thomas Nemecek; Our World in Data mirror",
  license: "CC BY 4.0 (OWID representation); original study terms per Science",
  attribution: "Poore, J. & Nemecek, T. (2018) Reducing food's environmental impacts through producers and consumers. Science 360:987–992.",
  version: "2018 (data baseline ~2010)",
};

/** PET water-bottle LCA review hosted by NEMS; stage-level secondary compilation. */
export const SOURCE_PET_BOTTLE_REVIEW: SourceRecord = {
  source_name: "Life Cycle Environmental Impact of PET Water Bottles (NEMS-hosted review)",
  source_url: "https://www.nems.nih.gov/Documents/PETWaterBottlesEnvironmentalImpact.pdf",
  source_publisher: "NEMS; compiles Franklin Associates 2011, Gleick & Cooley 2009, Gironi & Piemonte 2010, Papong et al. 2014",
  license: "待核实（机构公开网页综述；引用文献各自许可未逐一确认）",
  attribution: "PET Water Bottles Environmental Impact review, NEMS; underlying LCI: Franklin Associates (2011/2009), Gleick & Cooley (2009), Gironi & Piemonte (2010).",
  version: "review accessed 2026-11-15",
};

/** Franklin Associates 2009, Oregon DEQ drinking-water systems LCA. */
export const SOURCE_FRANKLIN_2009: SourceRecord = {
  source_name: "Life Cycle Assessment of Drinking Water Systems: Bottled, Tap and HOD Water (09-LQ-104)",
  source_url: "https://www.oregon.gov/deq/FilterDocs/wprLCycleAssessDW.pdf",
  source_publisher: "Franklin Associates (ERG) for Oregon Department of Environmental Quality",
  license: "待核实（美国州政府公开报告；使用条款未逐一确认）",
  attribution: "Franklin Associates, A Division of ERG, prepared for Oregon DEQ, revised final peer-reviewed LCA report, 2009-10-22.",
  version: "2009-10-22 (09-LQ-104)",
};

/** Agribalyse 3.2, ADEME — open European food LCI; documented cross-reference only. */
export const SOURCE_AGRIBALYSE_32: SourceRecord = {
  source_name: "AGRIBALYSE v3.2 – Synthèse",
  source_url: "https://data.ademe.fr/datasets/agribalyse-31-synthese",
  source_publisher: "ADEME (Agence de la transition écologique)",
  license: "Etalab Open Licence 2.0 / Licence Ouverte 2.0",
  attribution: "Source ADEME, AGRIBALYSE v3.2 – 2025 update.",
  version: "3.2",
};
