/**
 * CRUD operations for patient-tracking Basic resources.
 * Follows the same pattern as the EMR's stockQuantService.ts.
 */

import type { MedplumClient } from '@medplum/core';
import type { Basic, Extension } from '@medplum/fhirtypes';
import type { TrackingEntry, SurgicalPhase, ProcedureType } from '../types/tracking';
import { PHASES } from '../types/tracking';
import {
  TRACKING_CODE_SYSTEM,
  TRACKING_CODE,
  TRACKING_EXTENSIONS,
} from '../constants/fhir-systems';

// ── Cross-tab sync ──────────────────────────────────────────────────
// BroadcastChannel is like a walkie-talkie between browser tabs.
// When admin makes a change, it broadcasts "refresh" so the display
// tab picks it up instantly without waiting for the next poll.

export const TRACKING_CHANNEL_NAME = 'tracking-data-sync';

function notifyOtherTabs(): void {
  try {
    const channel = new BroadcastChannel(TRACKING_CHANNEL_NAME);
    channel.postMessage('refresh');
    channel.close();
  } catch {
    // BroadcastChannel not supported — display will still catch up via polling
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function getExtString(exts: Extension[] | undefined, url: string): string {
  return exts?.find((e) => e.url === url)?.valueString ?? '';
}

function getExtCode(exts: Extension[] | undefined, url: string): string {
  return exts?.find((e) => e.url === url)?.valueCode ?? '';
}

function getExtDateTime(exts: Extension[] | undefined, url: string): string {
  return exts?.find((e) => e.url === url)?.valueDateTime ?? '';
}

function getExtInteger(exts: Extension[] | undefined, url: string): number | null {
  const val = exts?.find((e) => e.url === url)?.valueInteger;
  return val !== undefined ? val : null;
}

/** Generate a random tracking code like "MH-A2X7" */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `MH-${result}`;
}

// ── Parse / Build ────────────────────────────────────────────────────

/** Map old 6-phase values to the new 3-phase model */
function normalizePhase(raw: string): SurgicalPhase {
  switch (raw) {
    case 'registered':
    case 'checked-in':
      return 'registered';
    case 'ongoing':
    case 'pre-op':
    case 'in-or':
    case 'surgery-active':
    case 'recovery':
      return 'ongoing';
    case 'finished':
    case 'completed':
      return 'finished';
    default:
      return 'registered';
  }
}

export function parseBasicToEntry(basic: Basic): TrackingEntry {
  const ext = basic.extension;
  return {
    id: basic.id ?? '',
    code: getExtString(ext, TRACKING_EXTENSIONS.CODE),
    patientName: getExtString(ext, TRACKING_EXTENSIONS.PATIENT_NAME),
    currentPhase: normalizePhase(getExtCode(ext, TRACKING_EXTENSIONS.CURRENT_PHASE)),
    phaseUpdatedAt: getExtDateTime(ext, TRACKING_EXTENSIONS.PHASE_UPDATED_AT),
    procedureType: (getExtString(ext, TRACKING_EXTENSIONS.PROCEDURE_TYPE) || 'surgery') as ProcedureType,
    notes: getExtString(ext, TRACKING_EXTENSIONS.NOTES),
    roomNumber: getExtString(ext, TRACKING_EXTENSIONS.ROOM_NUMBER),
    doctorName: getExtString(ext, TRACKING_EXTENSIONS.DOCTOR_NAME),
    estimatedDuration: getExtInteger(ext, TRACKING_EXTENSIONS.ESTIMATED_DURATION),
  };
}

function buildBasicResource(params: {
  code: string;
  patientName: string;
  phase: SurgicalPhase;
  procedureType: ProcedureType;
  notes: string;
  roomNumber?: string;
  doctorName?: string;
  estimatedDuration?: number | null;
}): Basic {
  const extensions: Extension[] = [
    { url: TRACKING_EXTENSIONS.CODE, valueString: params.code },
    { url: TRACKING_EXTENSIONS.PATIENT_NAME, valueString: params.patientName },
    { url: TRACKING_EXTENSIONS.CURRENT_PHASE, valueCode: params.phase },
    { url: TRACKING_EXTENSIONS.PHASE_UPDATED_AT, valueDateTime: new Date().toISOString() },
    { url: TRACKING_EXTENSIONS.PROCEDURE_TYPE, valueString: params.procedureType },
  ];
  if (params.notes) extensions.push({ url: TRACKING_EXTENSIONS.NOTES, valueString: params.notes });
  if (params.roomNumber) extensions.push({ url: TRACKING_EXTENSIONS.ROOM_NUMBER, valueString: params.roomNumber });
  if (params.doctorName) extensions.push({ url: TRACKING_EXTENSIONS.DOCTOR_NAME, valueString: params.doctorName });
  if (params.estimatedDuration) extensions.push({ url: TRACKING_EXTENSIONS.ESTIMATED_DURATION, valueInteger: params.estimatedDuration });

  return {
    resourceType: 'Basic',
    code: {
      coding: [
        {
          system: TRACKING_CODE_SYSTEM,
          code: TRACKING_CODE,
          display: 'Patient Tracking',
        },
      ],
    },
    meta: {
      tag: [{ system: TRACKING_CODE_SYSTEM, code: TRACKING_CODE }],
    },
    extension: extensions,
  };
}

// ── CRUD ─────────────────────────────────────────────────────────────

/** Fetch all patient-tracking entries */
export async function fetchAllEntries(medplum: MedplumClient): Promise<TrackingEntry[]> {
  const results = await medplum.searchResources('Basic', {
    _tag: `${TRACKING_CODE_SYSTEM}|${TRACKING_CODE}`,
    _count: '100',
    _sort: '-_lastUpdated',
  });
  return results.map(parseBasicToEntry);
}

/** Create a new tracked patient */
export async function createEntry(
  medplum: MedplumClient,
  params: {
    patientName: string;
    procedureType: ProcedureType;
    notes: string;
    roomNumber?: string;
    doctorName?: string;
    estimatedDuration?: number | null;
  }
): Promise<TrackingEntry> {
  const basic = buildBasicResource({
    code: generateCode(),
    patientName: params.patientName,
    phase: 'registered',
    procedureType: params.procedureType,
    notes: params.notes,
    roomNumber: params.roomNumber,
    doctorName: params.doctorName,
    estimatedDuration: params.estimatedDuration,
  });
  const created = await medplum.createResource(basic);
  medplum.invalidateSearches('Basic');
  notifyOtherTabs();
  return parseBasicToEntry(created);
}

/** Advance a patient to the next phase */
export async function advancePhase(
  medplum: MedplumClient,
  entry: TrackingEntry
): Promise<TrackingEntry> {
  const currentIdx = PHASES.indexOf(entry.currentPhase);
  if (currentIdx >= PHASES.length - 1) return entry; // already completed

  const nextPhase = PHASES[currentIdx + 1];
  return updatePhase(medplum, entry.id, nextPhase);
}

/** Set a specific phase on an entry */
export async function updatePhase(
  medplum: MedplumClient,
  id: string,
  phase: SurgicalPhase
): Promise<TrackingEntry> {
  const basic = await medplum.readResource('Basic', id);

  // Update extensions in place
  const exts = basic.extension ?? [];

  const setExt = (url: string, value: Record<string, unknown>) => {
    const idx = exts.findIndex((e) => e.url === url);
    if (idx >= 0) {
      exts[idx] = { url, ...value } as Extension;
    } else {
      exts.push({ url, ...value } as Extension);
    }
  };

  setExt(TRACKING_EXTENSIONS.CURRENT_PHASE, { valueCode: phase });
  setExt(TRACKING_EXTENSIONS.PHASE_UPDATED_AT, { valueDateTime: new Date().toISOString() });

  basic.extension = exts;
  const updated = await medplum.updateResource(basic);
  medplum.invalidateSearches('Basic');
  notifyOtherTabs();
  return parseBasicToEntry(updated);
}

/** Update an existing tracking entry's editable fields (optionally including phase) */
export async function updateEntry(
  medplum: MedplumClient,
  id: string,
  params: {
    patientName: string;
    procedureType: ProcedureType;
    notes: string;
    roomNumber: string;
    doctorName: string;
    estimatedDuration: number | null;
    phase?: SurgicalPhase;
  }
): Promise<TrackingEntry> {
  const basic = await medplum.readResource('Basic', id);
  const exts = basic.extension ?? [];

  const setExt = (url: string, value: Record<string, unknown>) => {
    const idx = exts.findIndex((e) => e.url === url);
    if (idx >= 0) {
      exts[idx] = { url, ...value } as Extension;
    } else {
      exts.push({ url, ...value } as Extension);
    }
  };

  const removeExt = (url: string) => {
    const idx = exts.findIndex((e) => e.url === url);
    if (idx >= 0) exts.splice(idx, 1);
  };

  setExt(TRACKING_EXTENSIONS.PATIENT_NAME, { valueString: params.patientName });
  setExt(TRACKING_EXTENSIONS.PROCEDURE_TYPE, { valueString: params.procedureType });

  // If phase was changed, update phase + timestamp
  if (params.phase) {
    setExt(TRACKING_EXTENSIONS.CURRENT_PHASE, { valueCode: params.phase });
    setExt(TRACKING_EXTENSIONS.PHASE_UPDATED_AT, { valueDateTime: new Date().toISOString() });
  }

  if (params.notes) setExt(TRACKING_EXTENSIONS.NOTES, { valueString: params.notes });
  else removeExt(TRACKING_EXTENSIONS.NOTES);

  if (params.roomNumber) setExt(TRACKING_EXTENSIONS.ROOM_NUMBER, { valueString: params.roomNumber });
  else removeExt(TRACKING_EXTENSIONS.ROOM_NUMBER);

  if (params.doctorName) setExt(TRACKING_EXTENSIONS.DOCTOR_NAME, { valueString: params.doctorName });
  else removeExt(TRACKING_EXTENSIONS.DOCTOR_NAME);

  if (params.estimatedDuration) setExt(TRACKING_EXTENSIONS.ESTIMATED_DURATION, { valueInteger: params.estimatedDuration });
  else removeExt(TRACKING_EXTENSIONS.ESTIMATED_DURATION);

  basic.extension = exts;
  const updated = await medplum.updateResource(basic);
  medplum.invalidateSearches('Basic');
  notifyOtherTabs();
  return parseBasicToEntry(updated);
}

/** Delete a tracking entry */
export async function deleteEntry(medplum: MedplumClient, id: string): Promise<void> {
  await medplum.deleteResource('Basic', id);
  medplum.invalidateSearches('Basic');
  notifyOtherTabs();
}
