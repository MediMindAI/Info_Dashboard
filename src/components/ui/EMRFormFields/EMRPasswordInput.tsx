import React, { useId, forwardRef, useCallback, memo } from 'react';
import { PasswordInput } from '@mantine/core';
import type { EMRPasswordInputProps } from './EMRFieldTypes';
import { EMRFieldWrapper } from './EMRFieldWrapper';
import './emr-fields.css';

export const EMRPasswordInput = memo(forwardRef<HTMLInputElement, EMRPasswordInputProps>(
  (
    {
      id, name, label, placeholder, helpText, description, error, successMessage, warningMessage,
      size = 'md', required, disabled, readOnly, validationState, leftSection, rightSection,
      className = '', style, 'data-testid': dataTestId, 'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy, fullWidth = true,
      value, defaultValue, onChange, onBlur, onFocus, onKeyDown, autoComplete, autoFocus,
    },
    ref
  ): React.JSX.Element => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const helpTextValue = description || helpText;

    const handleChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        if (onChange) onChange(event.target.value);
      },
      [onChange]
    );

    const getState = () => {
      if (validationState) return validationState;
      if (error) return 'error';
      if (successMessage) return 'success';
      if (warningMessage) return 'warning';
      return 'default';
    };

    const state = getState();
    const inputClasses = [
      'emr-input', `size-${size}`,
      state === 'error' && 'has-error',
      state === 'success' && 'has-success',
      state === 'warning' && 'has-warning',
    ].filter(Boolean).join(' ');

    const heights: Record<string, number> = { xs: 30, sm: 36, md: 42, lg: 48, xl: 54 };

    return (
      <EMRFieldWrapper label={label} required={required} helpText={helpTextValue} error={error}
        successMessage={successMessage} warningMessage={warningMessage} validationState={validationState}
        size={size} fullWidth={fullWidth} className={className} style={style} htmlFor={inputId}>
        <PasswordInput ref={ref} id={inputId} name={name}
          value={value} defaultValue={defaultValue} onChange={handleChange} onBlur={onBlur}
          onFocus={onFocus} onKeyDown={onKeyDown} placeholder={placeholder} disabled={disabled}
          readOnly={readOnly} autoComplete={autoComplete} autoFocus={autoFocus}
          required={required} aria-label={ariaLabel} aria-describedby={ariaDescribedBy}
          aria-invalid={state === 'error'} data-testid={dataTestId}
          leftSection={leftSection} rightSection={rightSection} error={!!error}
          classNames={{ input: inputClasses }}
          styles={{
            input: {
              minHeight: heights[size],
              fontSize: 'var(--emr-input-font-size)',
              borderColor: state === 'error' ? 'var(--emr-input-error-border)'
                : state === 'success' ? 'var(--emr-input-success-border)'
                : state === 'warning' ? 'var(--emr-input-warning-border)'
                : 'var(--emr-input-border)',
              borderRadius: 'var(--emr-input-border-radius)',
              transition: 'var(--emr-input-transition)',
            },
            wrapper: { width: fullWidth ? '100%' : undefined },
          }}
        />
      </EMRFieldWrapper>
    );
  }
));

EMRPasswordInput.displayName = 'EMRPasswordInput';
export default EMRPasswordInput;
