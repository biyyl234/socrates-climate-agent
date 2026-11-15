// ../data/src/types.ts
var LIFECYCLE_STAGES = [
  "agriculture",
  "processing",
  "transport",
  "cooking",
  "packaging",
  "use",
  "end_of_life"
];

// ../data/src/factors/sources.ts
var SOURCE_POORE_NEMECEK_2018 = {
  source_name: "Poore & Nemecek (2018), Science 360:987–992; OWID grapher mirror",
  source_url: "https://ourworldindata.org/grapher/ghg-per-kg-poore.csv",
  source_publisher: "Joseph Poore, Thomas Nemecek; Our World in Data mirror",
  license: "CC BY 4.0 (OWID representation); original study terms per Science",
  attribution: "Poore, J. & Nemecek, T. (2018) Reducing food's environmental impacts through producers and consumers. Science 360:987–992.",
  version: "2018 (data baseline ~2010)"
};
var SOURCE_PET_BOTTLE_REVIEW = {
  source_name: "Life Cycle Environmental Impact of PET Water Bottles (NEMS-hosted review)",
  source_url: "https://www.nems.nih.gov/Documents/PETWaterBottlesEnvironmentalImpact.pdf",
  source_publisher: "NEMS; compiles Franklin Associates 2011, Gleick & Cooley 2009, Gironi & Piemonte 2010, Papong et al. 2014",
  license: "待核实（机构公开网页综述；引用文献各自许可未逐一确认）",
  attribution: "PET Water Bottles Environmental Impact review, NEMS; underlying LCI: Franklin Associates (2011/2009), Gleick & Cooley (2009), Gironi & Piemonte (2010).",
  version: "review accessed 2026-11-15"
};
var SOURCE_FRANKLIN_2009 = {
  source_name: "Life Cycle Assessment of Drinking Water Systems: Bottled, Tap and HOD Water (09-LQ-104)",
  source_url: "https://www.oregon.gov/deq/FilterDocs/wprLCycleAssessDW.pdf",
  source_publisher: "Franklin Associates (ERG) for Oregon Department of Environmental Quality",
  license: "待核实（美国州政府公开报告；使用条款未逐一确认）",
  attribution: "Franklin Associates, A Division of ERG, prepared for Oregon DEQ, revised final peer-reviewed LCA report, 2009-10-22.",
  version: "2009-10-22 (09-LQ-104)"
};

// ../data/src/factors/factors.ts
function dq(reliability, completeness, temporal, geographic, tech, overall) {
  return { reliability, completeness, temporal, geographic, tech, overall };
}
var AGRIBALYSE_CROSS_REF = "Agribalyse 3.2 (ADEME, Etalab Open Licence 2.0) is documented as the open European cross-reference: https://data.ademe.fr/datasets/agribalyse-31-synthese";
var FACTORS = [
  // ---------------------------------------------------------------- bottled water
  {
    factor_id: "F-bottled-water-001",
    category_id: "bottled_water",
    lifecycle_stage: "packaging",
    activity: "500 ml PET 瓶体与瓶盖 — 树脂生产",
    activity_unit: "bottle",
    emission_factor_value: 0.0502,
    emission_factor_unit: "kgCO2e / bottle",
    interval_low: 0.0379,
    interval_high: 0.0625,
    gwp_version: "GWP100 (source LCI, version unspecified)",
    geography: "US",
    temporal_validity: "2009–2014 source studies",
    source_name: SOURCE_PET_BOTTLE_REVIEW.source_name,
    source_url: SOURCE_PET_BOTTLE_REVIEW.source_url,
    source_publisher: SOURCE_PET_BOTTLE_REVIEW.source_publisher,
    license: SOURCE_PET_BOTTLE_REVIEW.license,
    attribution: SOURCE_PET_BOTTLE_REVIEW.attribution,
    version: SOURCE_PET_BOTTLE_REVIEW.version,
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(3, 2, 3, 2, 3, "C"),
    data_type: "secondary",
    remarks: "树脂生产 2.19–2.733 kgCO2e/kg PET，按 13.3–26 g 瓶重换算为 0.0379–0.0625/500 ml 瓶；美国场景，中国本地电网与瓶重未纳入。"
  },
  {
    factor_id: "F-bottled-water-002",
    category_id: "bottled_water",
    lifecycle_stage: "processing",
    activity: "500 ml PET 瓶吹塑成型",
    activity_unit: "bottle",
    emission_factor_value: 0.04,
    emission_factor_unit: "kgCO2e / bottle",
    interval_low: 0.034,
    interval_high: 0.046,
    gwp_version: "GWP100 (source LCI, version unspecified)",
    geography: "US",
    temporal_validity: "2009–2014 source studies",
    source_name: SOURCE_PET_BOTTLE_REVIEW.source_name,
    source_url: SOURCE_PET_BOTTLE_REVIEW.source_url,
    source_publisher: SOURCE_PET_BOTTLE_REVIEW.source_publisher,
    license: SOURCE_PET_BOTTLE_REVIEW.license,
    attribution: SOURCE_PET_BOTTLE_REVIEW.attribution,
    version: SOURCE_PET_BOTTLE_REVIEW.version,
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(3, 2, 3, 2, 3, "C"),
    data_type: "secondary",
    remarks: "瓶坯注塑与吹塑 0.034–0.046 kgCO2e/500 ml 瓶；运输阶段来源未量化，本库未单列。"
  },
  {
    factor_id: "F-bottled-water-003",
    category_id: "bottled_water",
    lifecycle_stage: "use",
    activity: "500 ml 瓶装水 — 水处理灌装与冷藏",
    activity_unit: "bottle",
    emission_factor_value: 63e-4,
    emission_factor_unit: "kgCO2e / bottle",
    interval_low: 2e-4,
    interval_high: 0.0124,
    gwp_version: "GWP100 (source LCI, version unspecified)",
    geography: "US",
    temporal_validity: "2009–2014 source studies",
    source_name: SOURCE_PET_BOTTLE_REVIEW.source_name,
    source_url: SOURCE_PET_BOTTLE_REVIEW.source_url,
    source_publisher: SOURCE_PET_BOTTLE_REVIEW.source_publisher,
    license: SOURCE_PET_BOTTLE_REVIEW.license,
    attribution: SOURCE_PET_BOTTLE_REVIEW.attribution,
    version: SOURCE_PET_BOTTLE_REVIEW.version,
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(3, 2, 3, 2, 3, "C"),
    data_type: "secondary",
    remarks: "水处理灌装 0.0002 kgCO2e/瓶；冷藏 0.0248 kgCO2e/L × 0.5 L = 0.0124/瓶；区间为两端包络，点值取中值。"
  },
  {
    factor_id: "F-bottled-water-004",
    category_id: "bottled_water",
    lifecycle_stage: "end_of_life",
    activity: "500 ml PET 瓶末端处置（混合回收/填埋/焚烧）",
    activity_unit: "bottle",
    emission_factor_value: 0.01,
    emission_factor_unit: "kgCO2e / bottle",
    interval_low: null,
    interval_high: null,
    gwp_version: "GWP100 (source LCI, version unspecified)",
    geography: "US",
    temporal_validity: "2009–2014 source studies",
    source_name: SOURCE_PET_BOTTLE_REVIEW.source_name,
    source_url: SOURCE_PET_BOTTLE_REVIEW.source_url,
    source_publisher: SOURCE_PET_BOTTLE_REVIEW.source_publisher,
    license: SOURCE_PET_BOTTLE_REVIEW.license,
    attribution: SOURCE_PET_BOTTLE_REVIEW.attribution,
    version: SOURCE_PET_BOTTLE_REVIEW.version,
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(2, 2, 3, 2, 3, "D"),
    data_type: "secondary",
    remarks: "来源仅给出焚烧 0.0211、回收抵扣 −0.0114 kgCO2e/瓶；填埋负荷未量化。0.010 为混合处置工程假设，区间由 DQ 等级生成，待 CPCD/ecoinvent 本地因子替换。"
  },
  // ------------------------------------------------------------------ beverage
  {
    factor_id: "F-beverage-001",
    category_id: "beverage",
    lifecycle_stage: "packaging",
    activity: "500 ml PET 瓶装饮料瓶体（树脂生产）",
    activity_unit: "bottle",
    emission_factor_value: 0.0502,
    emission_factor_unit: "kgCO2e / bottle",
    interval_low: 0.0379,
    interval_high: 0.0625,
    gwp_version: "GWP100 (source LCI, version unspecified)",
    geography: "US",
    temporal_validity: "2009–2014 source studies",
    source_name: SOURCE_PET_BOTTLE_REVIEW.source_name,
    source_url: SOURCE_PET_BOTTLE_REVIEW.source_url,
    source_publisher: SOURCE_PET_BOTTLE_REVIEW.source_publisher,
    license: SOURCE_PET_BOTTLE_REVIEW.license,
    attribution: SOURCE_PET_BOTTLE_REVIEW.attribution,
    version: SOURCE_PET_BOTTLE_REVIEW.version,
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(3, 2, 3, 2, 3, "C"),
    data_type: "secondary",
    remarks: "通用 PET 瓶体因子，未区分碳酸/茶饮/果汁；饮料内容物足迹未覆盖。铝罐/利乐包因子待补。"
  },
  // ------------------------------------------------------------- meal: beef
  {
    factor_id: "F-meal-beef-001",
    category_id: "meal_beef",
    lifecycle_stage: "agriculture",
    activity: "350 g 牛肉套餐：牛肉 100 g + 米饭 150 g + 蔬菜 100 g（种植/养殖）",
    activity_unit: "meal",
    emission_factor_value: 10.6685,
    emission_factor_unit: "kgCO2e / meal",
    interval_low: null,
    interval_high: null,
    gwp_version: "AR5-GWP100 (study baseline)",
    geography: "GLOBAL",
    temporal_validity: "2010 baseline / 2018 publication",
    source_name: SOURCE_POORE_NEMECEK_2018.source_name,
    source_url: SOURCE_POORE_NEMECEK_2018.source_url,
    source_publisher: SOURCE_POORE_NEMECEK_2018.source_publisher,
    license: SOURCE_POORE_NEMECEK_2018.license,
    attribution: SOURCE_POORE_NEMECEK_2018.attribution,
    version: SOURCE_POORE_NEMECEK_2018.version,
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(3, 3, 3, 2, 3, "C"),
    data_type: "secondary",
    remarks: "按 P&N 全球平均 per-kg 产品值加权：牛肉 0.100×99.48 + 大米 0.150×4.45 + 蔬菜 0.100×0.53 = 10.6685 kgCO2e/份。P&N 数值为全链路平均，本库置于养殖/种植阶段；加工与运输不单列以避免重复计算。全球平均，中国本地养殖/电网差异未纳入。" + AGRIBALYSE_CROSS_REF + "。"
  },
  {
    factor_id: "F-meal-beef-002",
    category_id: "meal_beef",
    lifecycle_stage: "cooking",
    activity: "食堂烹饪能耗（单份套餐）",
    activity_unit: "meal",
    emission_factor_value: 0.15,
    emission_factor_unit: "kgCO2e / meal",
    interval_low: null,
    interval_high: null,
    gwp_version: "AR6-GWP100",
    geography: "CN",
    temporal_validity: "2025",
    source_name: "工程分摊假设（无公开 LCI 直接对应）",
    source_url: "",
    source_publisher: "Socrates 本地工程估算",
    license: "待核实",
    attribution: "内部假设，不对外引用为外部数据。",
    version: "0.1-draft",
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(2, 2, 3, 2, 3, "D"),
    data_type: "secondary",
    remarks: "食堂燃气/电力烹饪分摊假设值；未按本地电网因子折算，区间由 DQ 等级生成，待 CPCD 电力因子或实测替换。"
  },
  {
    factor_id: "F-meal-beef-003",
    category_id: "meal_beef",
    lifecycle_stage: "packaging",
    activity: "食堂可重复餐具/一次性餐具分摊（单份）",
    activity_unit: "meal",
    emission_factor_value: 0.05,
    emission_factor_unit: "kgCO2e / meal",
    interval_low: null,
    interval_high: null,
    gwp_version: "AR6-GWP100",
    geography: "CN",
    temporal_validity: "2025",
    source_name: "工程分摊假设（无公开 LCI 直接对应）",
    source_url: "",
    source_publisher: "Socrates 本地工程估算",
    license: "待核实",
    attribution: "内部假设，不对外引用为外部数据。",
    version: "0.1-draft",
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(2, 2, 3, 2, 3, "D"),
    data_type: "secondary",
    remarks: "可重复餐具按使用次数线性分摊（报告 §8.4）；一次性餐具全额计入的场景未覆盖，包材因子待 CPCD/ecoinvent 核实。"
  },
  // ----------------------------------------------------------- meal: veggie
  {
    factor_id: "F-meal-veggie-001",
    category_id: "meal_veggie",
    lifecycle_stage: "agriculture",
    activity: "350 g 素食套餐：米饭 150 g + 蔬菜 120 g + 豆腐 80 g（种植/加工原料）",
    activity_unit: "meal",
    emission_factor_value: 0.9839,
    emission_factor_unit: "kgCO2e / meal",
    interval_low: null,
    interval_high: null,
    gwp_version: "AR5-GWP100 (study baseline)",
    geography: "GLOBAL",
    temporal_validity: "2010 baseline / 2018 publication",
    source_name: SOURCE_POORE_NEMECEK_2018.source_name,
    source_url: SOURCE_POORE_NEMECEK_2018.source_url,
    source_publisher: SOURCE_POORE_NEMECEK_2018.source_publisher,
    license: SOURCE_POORE_NEMECEK_2018.license,
    attribution: SOURCE_POORE_NEMECEK_2018.attribution,
    version: SOURCE_POORE_NEMECEK_2018.version,
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(3, 3, 3, 2, 3, "C"),
    data_type: "secondary",
    remarks: "P&N 加权：大米 0.150×4.45 + 蔬菜 0.120×0.53 + 豆腐 0.080×3.16 = 0.9839 kgCO2e/份；与牛肉餐同 350 g 功能单位、同边界。菜品配方随食堂变化较大。" + AGRIBALYSE_CROSS_REF + "。"
  },
  {
    factor_id: "F-meal-veggie-002",
    category_id: "meal_veggie",
    lifecycle_stage: "cooking",
    activity: "食堂烹饪能耗（单份素食套餐）",
    activity_unit: "meal",
    emission_factor_value: 0.15,
    emission_factor_unit: "kgCO2e / meal",
    interval_low: null,
    interval_high: null,
    gwp_version: "AR6-GWP100",
    geography: "CN",
    temporal_validity: "2025",
    source_name: "工程分摊假设（无公开 LCI 直接对应）",
    source_url: "",
    source_publisher: "Socrates 本地工程估算",
    license: "待核实",
    attribution: "内部假设，不对外引用为外部数据。",
    version: "0.1-draft",
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(2, 2, 3, 2, 3, "D"),
    data_type: "secondary",
    remarks: "与牛肉餐同口径的烹饪分摊假设；待本地电网/燃气因子替换。"
  },
  {
    factor_id: "F-meal-veggie-003",
    category_id: "meal_veggie",
    lifecycle_stage: "packaging",
    activity: "食堂餐具分摊（单份素食套餐）",
    activity_unit: "meal",
    emission_factor_value: 0.05,
    emission_factor_unit: "kgCO2e / meal",
    interval_low: null,
    interval_high: null,
    gwp_version: "AR6-GWP100",
    geography: "CN",
    temporal_validity: "2025",
    source_name: "工程分摊假设（无公开 LCI 直接对应）",
    source_url: "",
    source_publisher: "Socrates 本地工程估算",
    license: "待核实",
    attribution: "内部假设，不对外引用为外部数据。",
    version: "0.1-draft",
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(2, 2, 3, 2, 3, "D"),
    data_type: "secondary",
    remarks: "与牛肉餐同口径餐具分摊；包材 LCI 待核实。"
  },
  // ------------------------------------------------------------------- snack
  {
    factor_id: "F-snack-001",
    category_id: "snack",
    lifecycle_stage: "agriculture",
    activity: "100 g 巧克力饼干：巧克力 30 g + 小麦粉 40 g + 蔗糖 15 g + 坚果 15 g",
    activity_unit: "pack",
    emission_factor_value: 1.51675,
    emission_factor_unit: "kgCO2e / pack",
    interval_low: null,
    interval_high: null,
    gwp_version: "AR5-GWP100 (study baseline)",
    geography: "GLOBAL",
    temporal_validity: "2010 baseline / 2018 publication",
    source_name: SOURCE_POORE_NEMECEK_2018.source_name,
    source_url: SOURCE_POORE_NEMECEK_2018.source_url,
    source_publisher: SOURCE_POORE_NEMECEK_2018.source_publisher,
    license: SOURCE_POORE_NEMECEK_2018.license,
    attribution: SOURCE_POORE_NEMECEK_2018.attribution,
    version: SOURCE_POORE_NEMECEK_2018.version,
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(3, 3, 3, 2, 3, "C"),
    data_type: "secondary",
    remarks: "P&N 加权：巧克力 0.030×46.65 + 小麦 0.040×1.57 + 蔗糖 0.015×3.20 + 坚果 0.015×0.43 = 1.51675 kgCO2e/包；配方为示例组合，实际零食按配料表加权。"
  },
  {
    factor_id: "F-snack-packaging-001",
    category_id: "snack_packaging",
    lifecycle_stage: "packaging",
    activity: "100 g 零食复合膜包装袋（约 10 g）",
    activity_unit: "pack",
    emission_factor_value: 0.05,
    emission_factor_unit: "kgCO2e / pack",
    interval_low: null,
    interval_high: null,
    gwp_version: "AR6-GWP100",
    geography: "CN",
    temporal_validity: "2025",
    source_name: "工程分摊假设（无公开 LCI 直接对应）",
    source_url: "",
    source_publisher: "Socrates 本地工程估算",
    license: "待核实",
    attribution: "内部假设，不对外引用为外部数据。",
    version: "0.1-draft",
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(2, 2, 3, 2, 3, "D"),
    data_type: "secondary",
    remarks: "复合膜（PET/PE/铝箔）包材因子为工程假设；待 CPCD 或 ecoinvent 包材 LCI 核实替换。"
  },
  {
    factor_id: "F-snack-packaging-002",
    category_id: "snack_packaging",
    lifecycle_stage: "end_of_life",
    activity: "零食包装末端处置（混合回收/填埋）",
    activity_unit: "pack",
    emission_factor_value: 0.02,
    emission_factor_unit: "kgCO2e / pack",
    interval_low: null,
    interval_high: null,
    gwp_version: "AR6-GWP100",
    geography: "CN",
    temporal_validity: "2025",
    source_name: "工程分摊假设（无公开 LCI 直接对应）",
    source_url: "",
    source_publisher: "Socrates 本地工程估算",
    license: "待核实",
    attribution: "内部假设，不对外引用为外部数据。",
    version: "0.1-draft",
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(2, 2, 3, 2, 3, "D"),
    data_type: "secondary",
    remarks: "混合处置工程假设；本地回收流比例未纳入。"
  },
  // -------------------------------------------------------- express packaging
  {
    factor_id: "F-express-packaging-001",
    category_id: "express_packaging",
    lifecycle_stage: "packaging",
    activity: "1 件典型快递包材组合（纸箱 + 缓冲 + 胶带）",
    activity_unit: "pack",
    emission_factor_value: 0.2,
    emission_factor_unit: "kgCO2e / pack",
    interval_low: null,
    interval_high: null,
    gwp_version: "AR6-GWP100",
    geography: "CN",
    temporal_validity: "2025",
    source_name: "工程分摊假设（无公开 LCI 直接对应）",
    source_url: "",
    source_publisher: "Socrates 本地工程估算",
    license: "待核实",
    attribution: "内部假设，不对外引用为外部数据。",
    version: "0.1-draft",
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(2, 2, 3, 2, 3, "D"),
    data_type: "secondary",
    remarks: "首版仅包材单元，不含快递运输全链路与商品本身（报告 §8.2）；包材 LCI 待核实。"
  },
  // --------------------------------------------------------------- tap water
  {
    factor_id: "F-other-001",
    category_id: "other",
    lifecycle_stage: "use",
    activity: "500 ml 校园直饮水（处理与输配，不含容器生产/清洗）",
    activity_unit: "bottle",
    emission_factor_value: 4e-4,
    emission_factor_unit: "kgCO2e / bottle",
    interval_low: null,
    interval_high: null,
    gwp_version: "GWP100 (source LCI, version unspecified)",
    geography: "US",
    temporal_validity: "2009",
    source_name: SOURCE_FRANKLIN_2009.source_name,
    source_url: SOURCE_FRANKLIN_2009.source_url,
    source_publisher: SOURCE_FRANKLIN_2009.source_publisher,
    license: SOURCE_FRANKLIN_2009.license,
    attribution: SOURCE_FRANKLIN_2009.attribution,
    version: SOURCE_FRANKLIN_2009.version,
    valid_from: "2025-01-01",
    valid_to: null,
    dq: dq(2, 2, 2, 2, 3, "D"),
    data_type: "secondary",
    remarks: "Franklin 2009 以 1000 加仑为功能单位；本条目按公开文献量级换算到 500 ml，具体数值待复核。不含可重复容器生产与清洗；校园直饮水机场景未建模。"
  }
];

// ../data/src/factors/index.ts
function getAllFactors() {
  return FACTORS.map((f) => ({ ...f, dq: { ...f.dq } }));
}

// ../data/src/engine/errors.ts
function makeError(code, message, missing = []) {
  return { code, message, missing };
}

// ../data/src/engine/pedigree.ts
var GRADE_MULTIPLIERS = {
  A: [1, 1.1],
  B: [1.1, 1.25],
  C: [1.25, 1.45],
  D: [1.45, 1.7],
  E: [1.7, 2]
};
function intervalFromGrade(value, grade) {
  const [lowMul, highMul] = GRADE_MULTIPLIERS[grade];
  return [round4(value * lowMul), round4(value * highMul)];
}
function confidenceForGrade(grade, relativeWidth) {
  switch (grade) {
    case "A":
      return "high";
    case "B":
      return "medium";
    case "C":
      return relativeWidth > 0.35 ? "low" : "medium";
    case "D":
    case "E":
      return "low";
  }
}
function worstGrade(grades) {
  const rank = { A: 0, B: 1, C: 2, D: 3, E: 4 };
  let worst = "A";
  for (const g of grades) {
    if (rank[g] > rank[worst]) worst = g;
  }
  return worst;
}
function round4(n) {
  return Math.round(n * 1e4) / 1e4;
}

// ../data/src/engine/units.ts
var DEFAULT_PORTION_G = 350;
var DEFAULT_BOTTLE_ML = 500;
var DEFAULT_PACK_G = 100;
function convertActivity(quantity, requestUnit, factorActivityUnit) {
  if (!Number.isFinite(quantity) || quantity < 0) {
    return { ok: false, error: makeError("INVALID_PAYLOAD", "quantity must be a non-negative number", []) };
  }
  const unit = requestUnit;
  if (unit === factorActivityUnit) return { ok: true, result: quantity };
  if (unit === "g" && factorActivityUnit === "g") return { ok: true, result: quantity };
  if (unit === "ml" && factorActivityUnit === "ml") return { ok: true, result: quantity };
  if (factorActivityUnit === "meal") {
    if (unit === "meal") return { ok: true, result: quantity };
    if (unit === "g") return { ok: true, result: quantity / DEFAULT_PORTION_G };
  }
  if (factorActivityUnit === "bottle") {
    if (unit === "bottle") return { ok: true, result: quantity };
    if (unit === "ml") return { ok: true, result: quantity / DEFAULT_BOTTLE_ML };
  }
  if (factorActivityUnit === "pack") {
    if (unit === "pack") return { ok: true, result: quantity };
    if (unit === "g") return { ok: true, result: quantity / DEFAULT_PACK_G };
  }
  return {
    ok: false,
    error: makeError(
      "INVALID_PAYLOAD",
      `Unsupported unit conversion: request unit "${unit}" → factor unit "${factorActivityUnit}"`,
      [unit, factorActivityUnit]
    )
  };
}
function functionalUnitLabel(categoryId, activityUnit) {
  switch (activityUnit) {
    case "meal":
      return `1 份标准食堂套餐（${DEFAULT_PORTION_G} g）`;
    case "bottle":
      return `1 瓶（${DEFAULT_BOTTLE_ML} ml）`;
    case "pack":
      return `1 包（${DEFAULT_PACK_G} g）`;
    default:
      return `1 ${categoryId}`;
  }
}

// ../data/src/engine/matching.ts
var GLOBAL_GEO = "GLOBAL";
function geoScore(factorGeo, requestedGeo, preferLocal) {
  if (!requestedGeo) return 2;
  if (!preferLocal) return 2;
  if (factorGeo === requestedGeo) return 3;
  if (factorGeo === GLOBAL_GEO) return 2;
  return 1;
}
function matchFactor(factors, categoryId, stage, options = {}) {
  const { geography, preferLocal = true } = options;
  let best;
  let bestScore = -1;
  for (const f of factors) {
    if (f.category_id !== categoryId || f.lifecycle_stage !== stage) continue;
    const score = geoScore(f.geography, geography, preferLocal);
    if (score > bestScore) {
      best = f;
      bestScore = score;
    }
  }
  return best;
}
function factorsByStage(factors, categoryId, stages) {
  const out = [];
  for (const stage of stages) {
    const hit = matchFactor(factors, categoryId, stage);
    if (hit) out.push(hit);
  }
  return out;
}

// ../data/src/engine/lca.ts
var CATEGORY_IDS = [
  "bottled_water",
  "beverage",
  "meal_beef",
  "meal_veggie",
  "snack",
  "snack_packaging",
  "express_packaging",
  "other"
];
var STAGE_LABELS = {
  agriculture: "原料/养殖",
  processing: "加工",
  transport: "运输",
  cooking: "食堂烹饪",
  packaging: "包装/餐具",
  use: "使用",
  end_of_life: "末端处置"
};
function isCategoryId(value) {
  return typeof value === "string" && CATEGORY_IDS.includes(value);
}
function geographyOf(attributes) {
  const g = attributes?.geography;
  return typeof g === "string" && g.length > 0 ? g : void 0;
}
function cite(factor) {
  return {
    factor_id: factor.factor_id,
    stage: factor.lifecycle_stage,
    source_name: factor.source_name,
    source_url: factor.source_url,
    license: factor.license,
    dq: factor.dq,
    valid_from: factor.valid_from,
    valid_to: factor.valid_to
  };
}
function calculateStages(request, factors) {
  const geography = geographyOf(request.attributes);
  const stages = factorsByStage(factors, request.category_id, LIFECYCLE_STAGES);
  const calcs = [];
  for (const factor of stages) {
    const amount = convertActivity(request.quantity, request.unit, factor.activity_unit);
    if (!amount.ok) return amount;
    const value = round4(factor.emission_factor_value * amount.result);
    let interval;
    if (factor.interval_low != null && factor.interval_high != null) {
      interval = [
        round4(factor.interval_low * amount.result),
        round4(factor.interval_high * amount.result)
      ];
    } else {
      interval = intervalFromGrade(value, factor.dq.overall);
    }
    calcs.push({
      factor,
      amount: amount.result,
      phase: {
        stage: factor.lifecycle_stage,
        label: STAGE_LABELS[factor.lifecycle_stage],
        value,
        interval
      }
    });
  }
  return { ok: true, result: calcs };
}
function calculateFootprint(request, factors = getAllFactors()) {
  if (!isCategoryId(request.category_id)) {
    return {
      ok: false,
      error: makeError("INVALID_PAYLOAD", `非法品类码：${String(request.category_id)}`, [
        String(request.category_id)
      ])
    };
  }
  const categoryFactors = factors.filter((f) => f.category_id === request.category_id);
  if (categoryFactors.length === 0) {
    return {
      ok: false,
      error: makeError(
        "FACTOR_NOT_FOUND",
        "未找到该品类的可用排放因子，已停止估算；请补充产品属性或选择已覆盖品类。",
        [request.category_id]
      )
    };
  }
  const stages = calculateStages(request, categoryFactors);
  if (!stages.ok) return stages;
  const calcs = stages.result;
  if (calcs.length === 0) {
    return {
      ok: false,
      error: makeError(
        "FACTOR_NOT_FOUND",
        "该品类在已覆盖阶段中无可用因子；已停止估算。",
        [request.category_id]
      )
    };
  }
  const totalValue = round4(calcs.reduce((sum, c) => sum + c.phase.value, 0));
  const totalLow = round4(calcs.reduce((sum, c) => sum + c.phase.interval[0], 0));
  const totalHigh = round4(calcs.reduce((sum, c) => sum + c.phase.interval[1], 0));
  const width = totalValue > 0 ? (totalHigh - totalLow) / totalValue : 0;
  const overall = worstGrade(calcs.map((c) => c.factor.dq.overall));
  const confidence = confidenceForGrade(overall, width);
  const geography = geographyOf(request.attributes);
  const notes = [];
  if (geography && calcs.some((c) => c.factor.geography !== geography && c.factor.geography !== "GLOBAL")) {
    notes.push("地理代表性偏弱：部分因子为全球/欧洲平均场景，本地餐食或产品需谨慎解读。");
  }
  notes.push("区间为保守包络估计：各阶段下限、上限分别求和，未做对数正态传播（报告 §8.5）。");
  const covered = new Set(calcs.map((c) => c.factor.lifecycle_stage));
  const uncovered = LIFECYCLE_STAGES.filter((s) => !covered.has(s));
  if (uncovered.length > 0) {
    notes.push(`未覆盖阶段：${uncovered.map((s) => STAGE_LABELS[s]).join("、")}。`);
  }
  const activityUnit = calcs[0]?.factor.activity_unit ?? "item";
  return {
    ok: true,
    result: {
      functional_unit: functionalUnitLabel(request.category_id, activityUnit),
      total: {
        value: totalValue,
        unit: "kgCO2e",
        interval: [totalLow, totalHigh],
        confidence
      },
      phases: calcs.map((c) => c.phase),
      factors: calcs.map((c) => cite(c.factor)),
      data_quality: { overall, notes },
      disclaimer: "本结果为归因型 LCA 估算区间，用于教育对话，不作为采购、认证或标签声明依据。"
    }
  };
}

// build/shared/http.ts
var ERROR_STATUS = {
  INVALID_PAYLOAD: 400,
  SESSION_REQUIRED: 401,
  TOPIC_BLOCKED: 403,
  PRODUCT_NOT_FOUND: 404,
  FACTOR_NOT_FOUND: 404,
  RATE_LIMITED: 429,
  UPSTREAM_ERROR: 502,
  LLM_UNAVAILABLE: 503,
  SPEECH_UNAVAILABLE: 503,
  LCA_ENGINE_ERROR: 503,
  UPSTREAM_TIMEOUT: 504,
  INTERNAL: 500
};
function statusForCode(code) {
  return ERROR_STATUS[code] ?? 500;
}
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-id, x-llm-model",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};
function preflightResponse() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8", ...extraHeaders }
  });
}
function errorResponse(code, message, details = [], retryAfter = null) {
  const status = statusForCode(code);
  const body = { error: { code, message, details, retry_after: retryAfter } };
  return jsonResponse(body, status);
}
async function readJsonBody(request) {
  const raw = await request.text();
  if (raw.trim().length === 0) {
    return { ok: false, value: null, issues: [{ field: "body", reason: "request body is empty" }] };
  }
  try {
    const value = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return {
        ok: false,
        value,
        issues: [{ field: "body", reason: "request body must be a JSON object" }]
      };
    }
    return { ok: true, value, issues: [] };
  } catch {
    return { ok: false, value: null, issues: [{ field: "body", reason: "invalid JSON" }] };
  }
}

// build/entries/lca.ts
var UNITS = /* @__PURE__ */ new Set(["meal", "bottle", "can", "pack", "item", "g", "ml"]);
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflightResponse();
  if (request.method !== "POST") {
    return errorResponse("INVALID_PAYLOAD", "Method not allowed; use POST", [
      { field: "method", reason: "expected POST" }
    ]);
  }
  const body = await readJsonBody(request);
  if (!body.ok) return errorResponse("INVALID_PAYLOAD", "请求体不满足 schema", body.issues);
  const raw = body.value;
  const issues = [];
  if (typeof raw.category_id !== "string" || raw.category_id.trim().length === 0) {
    issues.push({ field: "category_id", reason: "category_id is required" });
  }
  if (raw.attributes !== void 0 && (typeof raw.attributes !== "object" || raw.attributes === null)) {
    issues.push({ field: "attributes", reason: "attributes must be an object" });
  }
  if (typeof raw.quantity !== "number" || !Number.isFinite(raw.quantity) || raw.quantity < 0) {
    issues.push({ field: "quantity", reason: "quantity must be a non-negative number" });
  }
  if (typeof raw.unit !== "string" || !UNITS.has(raw.unit)) {
    issues.push({ field: "unit", reason: `unit must be one of ${[...UNITS].join(", ")}` });
  }
  if (issues.length > 0) return errorResponse("INVALID_PAYLOAD", "请求字段不满足 schema", issues);
  const outcome = calculateFootprint({
    category_id: raw.category_id,
    attributes: raw.attributes ?? {},
    quantity: raw.quantity,
    unit: raw.unit
  });
  if (!outcome.ok) {
    const code = outcome.error.code;
    return errorResponse(code, outcome.error.message, outcome.error.missing.map((m) => ({ field: "category_id", reason: m })));
  }
  return new Response(JSON.stringify(outcome.result), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" }
  });
});
