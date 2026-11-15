import { describe, expect, it } from "vitest";
import {
  buildAuthorizedFromToolResults,
  stripUnregisteredUrls,
  validateReply,
  type GuardTag,
} from "../../src/guards";

const footprintResult = {
  total: { value: 4.86, unit: "kgCO2e", interval: [3.62, 6.1], confidence: "medium" },
  factors: [
    {
      source_url: "https://data.ademe.fr/datasets/agribalyse-31-detail-par-ingredient",
      license: "Etalab Open Licence 2.0",
      version: "3.2",
    },
  ],
};

const authorized = buildAuthorizedFromToolResults([footprintResult]);

function tags(issues: { tag: GuardTag }[]): GuardTag[] {
  return issues.map((issue) => issue.tag);
}

describe("numeric whitelist", () => {
  it("accepts numbers returned by the tool result", () => {
    const report = validateReply("牛肉饭约 3.62–6.10 kgCO2e，区间来自已核对结果。", authorized);
    expect(tags(report.issues)).not.toContain("UNAUTHORIZED_NUMBER");
  });

  it("flags an emission number absent from tool results", () => {
    const report = validateReply("这份包装大约 2.5 kgCO2e。", authorized);
    expect(tags(report.issues)).toContain("UNAUTHORIZED_NUMBER");
  });
});

describe("source URL whitelist", () => {
  it("keeps registered source domains", () => {
    const report = validateReply(
      "数据：Agribalyse 3.2（https://data.ademe.fr/datasets/agribalyse-31-detail-par-ingredient）。",
      authorized,
    );
    expect(tags(report.issues)).not.toContain("UNREGISTERED_URL");
  });

  it("flags and strips unregistered domains", () => {
    const report = validateReply("看这个：https://evil.example.com/factor", authorized);
    expect(tags(report.issues)).toContain("UNREGISTERED_URL");
    const stripped = stripUnregisteredUrls("看这个：https://evil.example.com/factor");
    expect(stripped.stripped).toHaveLength(1);
    expect(stripped.text).not.toContain("evil.example.com");
  });
});

describe("citation enforcement", () => {
  it("flags a factor claim without an attached source", () => {
    const report = validateReply("1 kg 牛肉 ≈ 2.85 kgCO2e，是我估算的。", authorized);
    expect(tags(report.issues)).toContain("MISSING_CITATION");
  });

  it("accepts a factor claim carrying a source marker", () => {
    const report = validateReply(
      "数据：Agribalyse 3.2，https://data.ademe.fr/datasets/agribalyse-31-detail-par-ingredient；因子来自已核对记录。",
      authorized,
    );
    expect(tags(report.issues)).not.toContain("MISSING_CITATION");
  });
});

describe("low-confidence wording", () => {
  const weakContext = { lowConfidence: { lowConfidence: true, dq: "C" as const } };

  it("requires an explicit hedge phrase for weak results", () => {
    const report = validateReply("这是一个确定结论。", authorized, weakContext);
    expect(tags(report.issues)).toContain("LOW_CONFIDENCE_MISSING_WORDING");
  });

  it("passes when a hedge phrase is present", () => {
    const report = validateReply("这是粗略参考，因子来自其他地区，仅供方向参考。", authorized, weakContext);
    expect(tags(report.issues)).not.toContain("LOW_CONFIDENCE_MISSING_WORDING");
  });
});

describe("sensitive topics", () => {
  it("blocks hard political/religious/ethnicity topics", () => {
    const report = validateReply("我们用政治立场评价这个国家的政策吧。", authorized);
    expect(report.blocked).toBe(true);
    expect(tags(report.issues)).toContain("GUARDED_TOPIC");
  });

  it("redirects soft weight/anxiety topics without blocking", () => {
    const report = validateReply("我体重涨了，是不是该自责？", authorized);
    expect(report.blocked).toBe(false);
    expect(tags(report.issues)).toContain("GUARDED_TOPIC");
  });

  it("classifies commercial greenwashing as a soft redirect", () => {
    const report = validateReply("这个品牌是不是在漂绿？", authorized);
    expect(report.blocked).toBe(false);
    expect(tags(report.issues)).toContain("GUARDED_TOPIC");
  });
});

describe("regeneration policy", () => {
  it("flags number/citation issues as needing regeneration", () => {
    const report = validateReply("2.5 kgCO2e，无来源。", authorized);
    expect(report.needsRegeneration).toBe(true);
  });

  it("does not regenerate for a soft topic redirect", () => {
    const report = validateReply("我体重涨了。", authorized);
    expect(report.needsRegeneration).toBe(false);
  });
});
