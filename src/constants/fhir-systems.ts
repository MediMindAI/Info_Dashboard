/**
 * FHIR extension URLs for patient-tracking Basic resources.
 * Follows the same pattern as the EMR's fhir-systems.ts.
 */

export const FHIR_BASE_URL = 'http://medimind.ge/fhir' as const;

/** CodeSystem used to tag Basic resources as patient-tracking */
export const TRACKING_CODE_SYSTEM = `${FHIR_BASE_URL}/CodeSystem/resource-type` as const;
export const TRACKING_CODE = 'patient-tracking' as const;

/** Extension URLs for tracking fields */
export const TRACKING_EXTENSIONS = {
  CODE: `${FHIR_BASE_URL}/StructureDefinition/tracking-code`,
  PATIENT_NAME: `${FHIR_BASE_URL}/StructureDefinition/tracking-patient-name`,
  CURRENT_PHASE: `${FHIR_BASE_URL}/StructureDefinition/tracking-current-phase`,
  PHASE_UPDATED_AT: `${FHIR_BASE_URL}/StructureDefinition/tracking-phase-updated-at`,
  PROCEDURE_TYPE: `${FHIR_BASE_URL}/StructureDefinition/tracking-procedure-type`,
  NOTES: `${FHIR_BASE_URL}/StructureDefinition/tracking-notes`,
  ROOM_NUMBER: `${FHIR_BASE_URL}/StructureDefinition/tracking-room-number`,
  DOCTOR_NAME: `${FHIR_BASE_URL}/StructureDefinition/tracking-doctor-name`,
  ESTIMATED_DURATION: `${FHIR_BASE_URL}/StructureDefinition/tracking-estimated-duration`,
  DEPARTMENT: `${FHIR_BASE_URL}/StructureDefinition/tracking-department`,
} as const;
