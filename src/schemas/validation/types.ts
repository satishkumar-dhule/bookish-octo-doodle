export type ValidationError = {
  path: string;
  message: string;
  value?: any;
};

export type SchemaRule =
  | { type: "string"; minLength?: number; maxLength?: number; pattern?: RegExp }
  | { type: "number"; min?: number; max?: number; integer?: boolean }
  | { type: "boolean" }
  | { type: "array"; items: SchemaRule; minItems?: number; maxItems?: number }
  | { type: "object"; properties: Record<string, SchemaRule>; required?: string[] };

export type PrimitiveRule = { type: "string"; minLength?: number; maxLength?: number; pattern?: RegExp } | { type: "number"; min?: number; max?: number; integer?: boolean } | { type: "boolean" };

export function validateValue(value: any, rule: SchemaRule, path: string = ""): ValidationError[] {
  const errs: ValidationError[] = [];
  const add = (message: string, val?: any) => errs.push({ path, message, value: val ?? value });

  switch (rule.type) {
    case "string": {
      if (typeof value !== "string") {
        add("Expected string");
      } else {
        if (typeof rule.minLength === "number" && value.length < rule.minLength) {
          add(`String is shorter than minimum length ${rule.minLength}`);
        }
        if (typeof rule.maxLength === "number" && value.length > rule.maxLength) {
          add(`String is longer than maximum length ${rule.maxLength}`);
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          add("String does not match required pattern");
        }
      }
      break;
    }
    case "number": {
      if (typeof value !== "number" || Number.isNaN(value)) {
        add("Expected number");
      } else {
        if (typeof rule.min === "number" && value < rule.min) {
          add(`Number is less than minimum ${rule.min}`);
        }
        if (typeof rule.max === "number" && value > rule.max) {
          add(`Number is greater than maximum ${rule.max}`);
        }
        if (rule.integer && !Number.isInteger(value)) {
          add("Expected integer");
        }
      }
      break;
    }
    case "boolean": {
      if (typeof value !== "boolean") {
        add("Expected boolean");
      }
      break;
    }
    case "array": {
      if (!Array.isArray(value)) {
        add("Expected array");
      } else {
        if (typeof rule.minItems === "number" && value.length < rule.minItems) {
          errs.push({ path, message: `Array has fewer items (${value.length}) than minimum ${rule.minItems}`, value });
        }
        if (typeof rule.maxItems === "number" && value.length > rule.maxItems) {
          errs.push({ path, message: `Array has more items (${value.length}) than maximum ${rule.maxItems}`, value });
        }
        for (let i = 0; i < value.length; i++) {
          const childPath = path ? `${path}[${i}]` : `[${i}]`;
          const child = validateValue(value[i], rule.items, childPath);
          errs.push(...child);
        }
      }
      break;
    }
    case "object": {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        add("Expected object");
      } else {
        // Check required properties
        if (Array.isArray(rule.required)) {
          for (const key of rule.required) {
            if (!Object.prototype.hasOwnProperty.call(value, key)) {
              errs.push({ path: path ? `${path}.${key}` : key, message: "Missing required property", value: undefined });
            }
          }
        }
        // Validate defined properties
        for (const key of Object.keys(rule.properties)) {
          const childValue = (value as any)[key];
          const childRule = rule.properties[key];
          const childPath = path ? `${path}.${key}` : key;
          const childErrors = validateValue(childValue, childRule, childPath);
          errs.push(...childErrors);
        }
      }
      break;
    }
  }

  return errs;
}
