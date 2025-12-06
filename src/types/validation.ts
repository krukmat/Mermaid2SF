export interface ValidationError {
  code: string;
  message: string;
  elementId?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  elementId?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
