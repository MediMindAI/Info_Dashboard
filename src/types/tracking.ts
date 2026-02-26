/** Simplified surgical phases */
export const PHASES = [
  'registered',
  'ongoing',
  'finished',
] as const;

export type SurgicalPhase = (typeof PHASES)[number];

/** Procedure type is now free-text (any string) */
export type ProcedureType = string;

/** Department is now free-text (managed via Settings) */
export type Department = string;

/** Parsed tracking entry from a FHIR Basic resource */
export interface TrackingEntry {
  id: string;
  code: string;
  patientName: string;
  currentPhase: SurgicalPhase;
  phaseUpdatedAt: string;
  procedureType: ProcedureType;
  department: Department;
  notes: string;
  roomNumber: string;
  doctorName: string;
  estimatedDuration: number | null;
}
