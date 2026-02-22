import React from 'react';
import { IconAlertCircle, IconCheck, IconAlertTriangle } from '@tabler/icons-react';
import type { EMRFieldWrapperProps, EMRValidationState } from './EMRFieldTypes';
import './emr-fields.css';

interface ValidationInput {
  error?: string | boolean | null;
  successMessage?: string;
  warningMessage?: string;
  validationState?: EMRValidationState;
  helpText?: string;
}

function getValidationState(props: ValidationInput): EMRValidationState {
  if (props.validationState) return props.validationState;
  if (props.error) return 'error';
  if (props.successMessage) return 'success';
  if (props.warningMessage) return 'warning';
  return 'default';
}

function getValidationMessage(props: ValidationInput): string | undefined {
  const state = getValidationState(props);
  switch (state) {
    case 'error':
      return typeof props.error === 'string' ? props.error : undefined;
    case 'success':
      return props.successMessage;
    case 'warning':
      return props.warningMessage;
    default:
      return props.helpText;
  }
}

export function EMRFieldWrapper({
  label,
  required,
  helpText,
  error,
  successMessage,
  warningMessage,
  validationState,
  size = 'md',
  fullWidth = true,
  children,
  className = '',
  style,
  htmlFor,
}: EMRFieldWrapperProps): React.JSX.Element {
  const state = getValidationState({ error, successMessage, warningMessage, validationState });
  const message = getValidationMessage({ helpText, error, successMessage, warningMessage, validationState });

  const wrapperClasses = [
    'emr-field-wrapper',
    `size-${size}`,
    fullWidth && 'full-width',
    state === 'error' && 'has-error',
    state === 'success' && 'has-success',
    state === 'warning' && 'has-warning',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClasses} style={style}>
      {label && (
        <label className="emr-field-label" htmlFor={htmlFor}>
          {label}
          {required && <span className="emr-field-label-required">*</span>}
        </label>
      )}

      {children}

      {message && state === 'error' && (
        <div className="emr-field-error">
          <IconAlertCircle size={14} />
          <span>{message}</span>
        </div>
      )}

      {message && state === 'success' && (
        <div className="emr-field-success">
          <IconCheck size={14} />
          <span>{message}</span>
        </div>
      )}

      {message && state === 'warning' && (
        <div className="emr-field-warning">
          <IconAlertTriangle size={14} />
          <span>{message}</span>
        </div>
      )}

      {message && state === 'default' && (
        <div className="emr-field-help">{message}</div>
      )}
    </div>
  );
}

export default EMRFieldWrapper;
