/**
 * Tool argument / result validation (report §4.8, §7.4).
 *
 * - `validateToolArgs` runs the JSON Schema against declared parameters.
 * - `validateToolResult` runs `result_schema` plus numeric range, interval,
 *   unit, source-domain and metadata checks.
 * - `validateToolForState` gates a call against the frozen MI state machine
 *   via `isToolAllowed`.
 */

import type { MIState, ToolName } from "../mi/states";
import { isToolAllowed } from "../mi/states";
import { getToolDefinition, type JsonSchema } from "./schemas";
import {
  EMISSION_UNIT_WHITELIST,
  isRegisteredSourceUrl,
} from "../guards/source-whitelist";

export interface ValidationIssue {
  field: string;
  reason: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

function okResult(): ValidationResult {
  return { ok: true, issues: [] };
}

function fail(issues: ValidationIssue[]): ValidationResult {
  return { ok: false, issues };
}

// ---------------------------------------------------------------------------
// Generic JSON Schema subset validator
// ---------------------------------------------------------------------------

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeType(schema: JsonSchema): string[] {
  if (schema.type === undefined) return [];
  return Array.isArray(schema.type) ? schema.type : [schema.type];
}

function typeMatches(schema: JsonSchema, value: unknown): boolean {
  const allowed = normalizeType(schema);
  if (allowed.length === 0) return true;
  if (value === null) return allowed.includes("null");
  switch (allowed[0]) {
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "number":
      return typeof value === "number";
    case "string":
      return typeof value === "string";
    case "boolean":
      return typeof value === "boolean";
    case "array":
      return Array.isArray(value);
    case "object":
      return isPlainObject(value);
    default:
      return true;
  }
}

function validateSchema(
  schema: JsonSchema,
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  // Unknown / free-form schema.
  if (schema.type === undefined && !schema.properties && !schema.items) return;

  if (!typeMatches(schema, value)) {
    issues.push({
      field: path,
      reason: `expected type ${Array.isArray(schema.type) ? schema.type.join("|") : String(schema.type)}`,
    });
    return;
  }
  if (value === null) return;

  if (schema.enum && !schema.enum.some((v) => v === value)) {
    issues.push({ field: path, reason: `value ${JSON.stringify(value)} not in enum` });
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      issues.push({ field: path, reason: `shorter than minLength ${schema.minLength}` });
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      issues.push({ field: path, reason: `longer than maxLength ${schema.maxLength}` });
    }
  }

  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      issues.push({ field: path, reason: `below minimum ${schema.minimum}` });
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      issues.push({ field: path, reason: `above maximum ${schema.maximum}` });
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      issues.push({ field: path, reason: `fewer than minItems ${schema.minItems}` });
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      issues.push({ field: path, reason: `more than maxItems ${schema.maxItems}` });
    }
    if (schema.items) {
      value.forEach((item, index) =>
        validateSchema(schema.items!, item, `${path}[${index}]`, issues),
      );
    }
    return;
  }

  if (isPlainObject(value)) {
    if (schema.required) {
      for (const key of schema.required) {
        if (!(key in value)) {
          issues.push({ field: `${path}.${key}`, reason: "missing required property" });
        }
      }
    }
    if (schema.properties) {
      for (const [key, sub] of Object.entries(schema.properties)) {
        if (key in value) validateSchema(sub, value[key], `${path}.${key}`, issues);
      }
    }
    if (schema.additionalProperties === false && schema.properties) {
      for (const key of Object.keys(value)) {
        if (!(key in schema.properties)) {
          issues.push({ field: `${path}.${key}`, reason: "additional property not allowed" });
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Public validators
// ---------------------------------------------------------------------------

export function validateToolArgs(tool: ToolName, args: unknown): ValidationResult {
  const def = getToolDefinition(tool);
  const issues: ValidationIssue[] = [];
  if (!isPlainObject(args)) {
    return fail([{ field: "args", reason: "arguments must be an object" }]);
  }
  validateSchema(def.parameters, args, "args", issues);
  return issues.length === 0 ? okResult() : fail(issues);
}

function assertInterval(
  interval: unknown,
  field: string,
  issues: ValidationIssue[],
): [number, number] | null {
  if (!Array.isArray(interval) || interval.length !== 2) {
    issues.push({ field, reason: "interval must be a 2-element [low, high] array" });
    return null;
  }
  const [low, high] = interval as unknown[];
  if (typeof low !== "number" || typeof high !== "number") {
    issues.push({ field, reason: "interval bounds must be numbers" });
    return null;
  }
  if (low > high) {
    issues.push({ field, reason: `interval lower bound ${low} exceeds upper bound ${high}` });
  }
  return [low, high];
}

function checkSourceMetadata(
  record: Record<string, unknown>,
  field: string,
  issues: ValidationIssue[],
): void {
  const sourceUrl = record.source_url;
  if (typeof sourceUrl === "string" && sourceUrl.length > 0) {
    if (!isRegisteredSourceUrl(sourceUrl)) {
      issues.push({ field: `${field}.source_url`, reason: "domain not registered in source whitelist" });
    }
  }
  const license = record.license;
  if (license !== undefined && (typeof license !== "string" || license.trim().length === 0)) {
    issues.push({ field: `${field}.license`, reason: "license must be a non-empty string" });
  }
  const version = record.version;
  if (version !== undefined && (typeof version !== "string" || version.trim().length === 0)) {
    issues.push({ field: `${field}.version`, reason: "version must be a non-empty string" });
  }
}

function validateResultCrossChecks(
  tool: ToolName,
  result: Record<string, unknown>,
  issues: ValidationIssue[],
): void {
  switch (tool) {
    case "get_emission_factors": {
      const factors = result.factors;
      if (!Array.isArray(factors)) return;
      factors.forEach((raw, index) => {
        if (!isPlainObject(raw)) return;
        const factor = raw;
        const field = `factors[${index}]`;
        const value = factor.factor_value;
        if (typeof value === "number" && value < 0) {
          issues.push({ field: `${field}.factor_value`, reason: "factor value must be >= 0" });
        }
        const low = factor.interval_low;
        const high = factor.interval_high;
        if (typeof low === "number" && typeof high === "number" && typeof value === "number") {
          if (low > value || value > high) {
            issues.push({ field, reason: "factor value must lie within [interval_low, interval_high]" });
          }
        }
        checkSourceMetadata(factor, field, issues);
      });
      break;
    }
    case "calculate_footprint": {
      const total = result.total;
      if (isPlainObject(total)) {
        if (typeof total.value === "number" && total.value < 0) {
          issues.push({ field: "total.value", reason: "footprint value must be >= 0" });
        }
        if (typeof total.unit === "string" && !EMISSION_UNIT_WHITELIST.has(total.unit)) {
          issues.push({ field: "total.unit", reason: `unit "${total.unit}" not in emission unit whitelist` });
        }
        assertInterval(total.interval, "total.interval", issues);
      }
      const phases = result.phases;
      if (Array.isArray(phases)) {
        phases.forEach((raw, index) => {
          if (!isPlainObject(raw)) return;
          if (typeof raw.value === "number" && raw.value < 0) {
            issues.push({ field: `phases[${index}].value`, reason: "phase value must be >= 0" });
          }
          assertInterval(raw.interval, `phases[${index}].interval`, issues);
        });
      }
      const factors = result.factors;
      if (Array.isArray(factors)) {
        factors.forEach((raw, index) => {
          if (isPlainObject(raw)) checkSourceMetadata(raw, `factors[${index}]`, issues);
        });
      }
      break;
    }
    case "compare_alternatives": {
      const items = result.items;
      if (Array.isArray(items)) {
        items.forEach((raw, index) => {
          if (!isPlainObject(raw)) return;
          const footprint = raw.footprint;
          if (isPlainObject(footprint)) {
            if (typeof footprint.value === "number" && footprint.value < 0) {
              issues.push({ field: `items[${index}].footprint.value`, reason: "value must be >= 0" });
            }
            if (typeof footprint.unit === "string" && !EMISSION_UNIT_WHITELIST.has(footprint.unit)) {
              issues.push({
                field: `items[${index}].footprint.unit`,
                reason: "unit not in emission unit whitelist",
              });
            }
            assertInterval(footprint.interval, `items[${index}].footprint.interval`, issues);
          }
        });
      }
      break;
    }
    default:
      break;
  }
}

export function validateToolResult(tool: ToolName, result: unknown): ValidationResult {
  const def = getToolDefinition(tool);
  const issues: ValidationIssue[] = [];
  if (!isPlainObject(result)) {
    return fail([{ field: "result", reason: "tool result must be an object" }]);
  }
  validateSchema(def.result_schema, result, "result", issues);
  validateResultCrossChecks(tool, result, issues);
  return issues.length === 0 ? okResult() : fail(issues);
}

export function validateToolForState(state: MIState, tool: ToolName): ValidationResult {
  if (isToolAllowed(state, tool)) return okResult();
  return fail([
    {
      field: `state.${state}`,
      reason: `tool "${tool}" is not permitted in MI state "${state}"`,
    },
  ]);
}

/** Full call gate: state permission first, then argument schema. */
export function validateToolCall(
  state: MIState,
  tool: ToolName,
  args: unknown,
): ValidationResult {
  const stateCheck = validateToolForState(state, tool);
  if (!stateCheck.ok) return stateCheck;
  return validateToolArgs(tool, args);
}
