import React, { useId, forwardRef, useCallback } from 'react';
import { NumberInput } from '@mantine/core';
import type { EMRNumberInputProps } from './EMRFieldTypes';
import { EMRFieldWrapper } from './EMRFieldWrapper';
import './emr-fields.css';

export const EMRNumberInput = forwardRef<HTMLInputElement, EMRNumberInputProps>(
  (
    {
      id, name, label, placeholder, helpText, error, successMessage, warningMessage,
      size = 'md', required, disabled, readOnly, validationState, leftSection, rightSection,
      className = '', style, 'data-testid': dataTestId, 'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy, fullWidth = true,
      value, defaultValue, onChange, onBlur, min, max, step = 1, decimalScale,
      decimalSeparator = '.', thousandSeparator, prefix, suffix,
      hideControls = false, allowNegative = true, clampBehavior = 'blur',
    },
    ref
  ): React.JSX.Element => {
    const generatedId = useId();
    const inputId = id || generatedId;

    const handleChange = useCallback((newValue: number | string) => {
      if (onChange) onChange(newValue);
    }, [onChange]);

    const getState = () => {
      if (validationState) return validationState;
      if (error) return 'error';
      if (successMessage) return 'success';
      if (warningMessage) return 'warning';
      return 'default';
    };

    const state = getState();
    const heights: Record<string, number> = { xs: 30, sm: 36, md: 42, lg: 48, xl: 54 };
    const inputClasses = [
      'emr-input', `size-${size}`,
      state === 'error' && 'has-error',
      state === 'success' && 'has-success',
      state === 'warning' && 'has-warning',
    ].filter(Boolean).join(' ');

    return (
      <EMRFieldWrapper label={label} required={required} helpText={helpText} error={error}
        successMessage={successMessage} warningMessage={warningMessage} validationState={validationState}
        size={size} fullWidth={fullWidth} className={className} style={style} htmlFor={inputId}>
        <NumberInput ref={ref} id={inputId} name={name} value={value} defaultValue={defaultValue}
          onChange={handleChange} onBlur={onBlur} placeholder={placeholder} disabled={disabled}
          readOnly={readOnly} min={min} max={max} step={step} decimalScale={decimalScale}
          decimalSeparator={decimalSeparator} thousandSeparator={thousandSeparator}
          prefix={prefix} suffix={suffix} hideControls={hideControls}
          allowNegative={allowNegative} clampBehavior={clampBehavior}
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
            control: {
              borderColor: 'var(--emr-input-border)',
            },
          }}
        />
      </EMRFieldWrapper>
    );
  }
);

EMRNumberInput.displayName = 'EMRNumberInput';
export default EMRNumberInput;
