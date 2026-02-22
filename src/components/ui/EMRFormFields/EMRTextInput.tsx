import React, { useId, forwardRef, useCallback, memo } from 'react';
import { TextInput } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import type { EMRTextInputProps } from './EMRFieldTypes';
import { EMRFieldWrapper } from './EMRFieldWrapper';
import { useTranslation } from '../../../contexts/TranslationContext';
import './emr-fields.css';

export const EMRTextInput = memo(forwardRef<HTMLInputElement, EMRTextInputProps>(
  (
    {
      id, name, label, placeholder, helpText, description, error, successMessage, warningMessage,
      size = 'md', required, disabled, readOnly, validationState, leftSection, rightSection,
      className = '', style, 'data-testid': dataTestId, 'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy, clearable, onClear, fullWidth = true,
      type = 'text', inputMode, value, defaultValue, onChange, onChangeEvent,
      onBlur, onFocus, onKeyDown, maxLength, pattern, autoComplete, autoFocus,
    },
    ref
  ): React.JSX.Element => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const { t } = useTranslation();
    const helpTextValue = description || helpText;

    const handleChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        if (onChangeEvent) onChangeEvent(event);
        if (onChange) onChange(event.target.value);
      },
      [onChange, onChangeEvent]
    );

    const handleClear = useCallback(() => {
      if (onClear) onClear();
      else if (onChange) onChange('');
    }, [onClear, onChange]);

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
      leftSection && 'has-left-section',
      (rightSection || (clearable && value)) && 'has-right-section',
    ].filter(Boolean).join(' ');

    const heights: Record<string, number> = { xs: 30, sm: 36, md: 42, lg: 48, xl: 54 };

    const rightSectionContent = clearable && value ? (
      <button type="button" className="emr-input-clear-btn" onClick={handleClear} tabIndex={-1}
        aria-label={t('common.clearInput')}>
        <IconX size={14} />
      </button>
    ) : rightSection;

    return (
      <EMRFieldWrapper label={label} required={required} helpText={helpTextValue} error={error}
        successMessage={successMessage} warningMessage={warningMessage} validationState={validationState}
        size={size} fullWidth={fullWidth} className={className} style={style} htmlFor={inputId}>
        <TextInput ref={ref} id={inputId} name={name} type={type} inputMode={inputMode}
          value={value} defaultValue={defaultValue} onChange={handleChange} onBlur={onBlur}
          onFocus={onFocus} onKeyDown={onKeyDown} placeholder={placeholder} disabled={disabled}
          readOnly={readOnly} maxLength={maxLength} pattern={pattern} autoComplete={autoComplete}
          autoFocus={autoFocus} required={required} aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy} aria-invalid={state === 'error'} data-testid={dataTestId}
          leftSection={leftSection} rightSection={rightSectionContent} error={!!error}
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

EMRTextInput.displayName = 'EMRTextInput';
export default EMRTextInput;
