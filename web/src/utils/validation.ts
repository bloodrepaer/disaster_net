/**
 * Form validation utilites
 */

import React from 'react';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationRules {
  [key: string]: ((value: any) => string | null)[];
}

export function validateEmail(email: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return 'Email is required';
  if (!emailRegex.test(email)) return 'Invalid email format';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  return null;
}

export function validatePhone(phone: string): string | null {
  const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s]?[0-9]{3}[-\s]?[0-9]{4,6}$/;
  if (!phone) return null; // Optional field
  if (!phoneRegex.test(phone)) return 'Invalid phone number';
  return null;
}

export function validateRequired(value: any): string | null {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return 'This field is required';
  }
  return null;
}

export function validateMinLength(length: number) {
  return (value: string): string | null => {
    if (!value) return null;
    if (value.length < length) return `Must be at least ${length} characters`;
    return null;
  };
}

export function validateMaxLength(length: number) {
  return (value: string): string | null => {
    if (!value) return null;
    if (value.length > length) return `Must not exceed ${length} characters`;
    return null;
  };
}

export function validateNumber(value: any): string | null {
  if (value === '' || value === null) return null;
  if (isNaN(Number(value))) return 'Must be a valid number';
  return null;
}

export function validateAge(value: any): string | null {
  const num = Number(value);
  if (isNaN(num)) return 'Age must be a number';
  if (num < 0 || num > 150) return 'Age must be between 0 and 150';
  return null;
}

export function validateForm(
  formData: Record<string, any>,
  rules: ValidationRules
): ValidationError[] {
  const errors: ValidationError[] = [];

  Object.entries(rules).forEach(([field, validators]) => {
    const value = formData[field];
    for (const validator of validators) {
      const error = validator(value);
      if (error) {
        errors.push({ field, message: error });
        break; // Stop on first error for this field
      }
    }
  });

  return errors;
}

export function useFormValidation(initialValues: Record<string, any>, rules: ValidationRules) {
  const [values, setValues] = React.useState(initialValues);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const validate = (fieldName: string, value: any) => {
    const fieldRules = rules[fieldName];
    if (!fieldRules) return null;

    for (const validator of fieldRules) {
      const error = validator(value);
      if (error) return error;
    }
    return null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));

    if (touched[name]) {
      const error = validate(name, value);
      setErrors(prev => ({
        ...prev,
        [name]: error || '',
      }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));

    const error = validate(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error || '',
    }));
  };

  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    Object.keys(rules).forEach(fieldName => {
      const error = validate(fieldName, values[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    reset,
    setValues,
  };
}
