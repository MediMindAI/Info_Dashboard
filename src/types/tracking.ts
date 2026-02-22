/** Simplified surgical phases */
export const PHASES = [
  'registered',
  'ongoing',
  'finished',
] as const;

export type SurgicalPhase = (typeof PHASES)[number];

/** Procedure types */
export const PROCEDURE_TYPES = [
  'surgery',
  'diagnostic',
  'endoscopy',
  'cardiac',
  'other',
] as const;

export type ProcedureType = (typeof PROCEDURE_TYPES)[number];

/** Parsed tracking entry from a FHIR Basic resource */
export interface TrackingEntry {
  id: string;
  code: string;
  patientName: string;
  currentPhase: SurgicalPhase;
  phaseUpdatedAt: string;
  procedureType: ProcedureType;
  notes: string;
  roomNumber: string;
  doctorName: string;
  estimatedDuration: number | null;
}
