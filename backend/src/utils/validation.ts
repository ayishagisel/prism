export interface ValidationError {
  field: string;
  message: string;
}

export class ValidationException extends Error {
  constructor(public errors: ValidationError[]) {
    super('Validation error');
  }
}

export const validate = (data: any, rules: Record<string, ValidationRule[]>) => {
  const errors: ValidationError[] = [];

  for (const field in rules) {
    const fieldRules = rules[field];
    const value = data[field];

    for (const rule of fieldRules) {
      const error = rule(value, field);
      if (error) {
        errors.push(error);
      }
    }
  }

  if (errors.length > 0) {
    throw new ValidationException(errors);
  }
};

export type ValidationRule = (value: any, field: string) => ValidationError | null;

export const required: ValidationRule = (value, field) => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return { field, message: `${field} is required` };
  }
  return null;
};

export const email: ValidationRule = (value, field) => {
  if (!value) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return { field, message: `${field} must be a valid email` };
  }
  return null;
};

export const minLength = (min: number): ValidationRule => (value, field) => {
  if (!value) return null;
  if (typeof value !== 'string' || value.length < min) {
    return { field, message: `${field} must be at least ${min} characters` };
  }
  return null;
};
