import type { ReactNode, CSSProperties, SVGAttributes } from 'react';

export type IconProps = SVGAttributes<SVGElement> & {
  size?: number | string;
  stroke?: number | string;
};

export type EMRInputSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type EMRValidationState = 'default' | 'error' | 'success' | 'warning';

export interface EMRFieldBaseProps {
  id?: string;
  name?: string;
  label?: ReactNode;
  placeholder?: string;
  helpText?: string;
  error?: string | boolean | null;
  successMessage?: string;
  warningMessage?: string;
  size?: EMRInputSize;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  validationState?: EMRValidationState;
  leftSection?: ReactNode;
  rightSection?: ReactNode;
  className?: string;
  style?: CSSProperties;
  'data-testid'?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  clearable?: boolean;
  onClear?: () => void;
  fullWidth?: boolean;
}

export interface EMRTextInputProps extends EMRFieldBaseProps {
  type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number' | 'time';
  inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onChangeEvent?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  maxLength?: number;
  pattern?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  description?: string;
  styles?: Record<string, unknown>;
  rightSectionWidth?: number;
}

export interface EMRPasswordInputProps extends EMRFieldBaseProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  autoFocus?: boolean;
  description?: string;
}

export interface EMRSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
  description?: string;
}

export interface EMRSelectProps extends EMRFieldBaseProps {
  data: EMRSelectOption[] | string[];
  value?: string | null;
  defaultValue?: string;
  onChange?: (value: string | null) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  searchable?: boolean;
  nothingFoundMessage?: string;
  maxDropdownHeight?: number;
  allowDeselect?: boolean;
  checkIconPosition?: 'left' | 'right';
  dropdownPosition?: 'bottom' | 'top' | 'flip';
  filter?: (options: { options: EMRSelectOption[]; search: string }) => EMRSelectOption[];
  renderOption?: (item: { option: { value: string; label: string } }) => ReactNode;
  description?: string;
  styles?: Record<string, unknown>;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

export interface EMRNumberInputProps extends EMRFieldBaseProps {
  value?: number | string;
  defaultValue?: number;
  onChange?: (value: number | string) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
  step?: number;
  decimalScale?: number;
  decimalSeparator?: string;
  thousandSeparator?: string;
  prefix?: string;
  suffix?: string;
  hideControls?: boolean;
  allowNegative?: boolean;
  clampBehavior?: 'blur' | 'strict' | 'none';
}

export interface EMRTextareaProps extends EMRFieldBaseProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onChangeEvent?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  minRows?: number;
  maxRows?: number;
  autosize?: boolean;
  maxLength?: number;
  showCount?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export interface EMRFieldWrapperProps {
  label?: ReactNode;
  required?: boolean;
  helpText?: string;
  error?: string | boolean | null;
  successMessage?: string;
  warningMessage?: string;
  validationState?: EMRValidationState;
  size?: EMRInputSize;
  fullWidth?: boolean;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  htmlFor?: string;
}
