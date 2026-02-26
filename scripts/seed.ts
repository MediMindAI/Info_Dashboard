/**
 * Seed script: wipes all existing patient-tracking entries and creates
 * 30 new ones with realistic Georgian names, spread across departments,
 * phases, and procedure types.
 *
 * Usage:  npm run seed
 */

import { MedplumClient, MemoryStorage } from '@medplum/core';
import type { Basic, Extension } from '@medplum/fhirtypes';
import type { SurgicalPhase, ProcedureType, Department } from '../src/types/tracking';
import {
  TRACKING_CODE_SYSTEM,
  TRACKING_CODE,
  TRACKING_EXTENSIONS,
} from '../src/constants/fhir-systems';

// ── Load .env manually (Node --env-file doesn't work with tsx) ──────

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');
try {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    process.env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }
} catch {
  console.error(`Could not read ${envPath}`);
  process.exit(1);
}

const MEDPLUM_BASE = process.env.VITE_MEDPLUM_BASE_URL;
const PROJECT_ID = process.env.VITE_MEDPLUM_PROJECT_ID;
const EMAIL = process.env.VITE_DISPLAY_EMAIL;
const PASSWORD = process.env.VITE_DISPLAY_PASSWORD;

if (!MEDPLUM_BASE || !PROJECT_ID || !EMAIL || !PASSWORD) {
  console.error('Missing env vars. Check .env has VITE_MEDPLUM_BASE_URL, VITE_MEDPLUM_PROJECT_ID, VITE_DISPLAY_EMAIL, VITE_DISPLAY_PASSWORD');
  process.exit(1);
}

// Medplum reads sessionStorage for PKCE challenges
(globalThis as any).sessionStorage = new MemoryStorage();

const medplum = new MedplumClient({ baseUrl: MEDPLUM_BASE, fetch });

// ── Helpers (copied from trackingService to avoid browser deps) ─────

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `MH-${result}`;
}

function buildBasicResource(params: {
  code: string;
  patientName: string;
  phase: SurgicalPhase;
  procedureType: ProcedureType;
  department: Department;
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
    { url: TRACKING_EXTENSIONS.DEPARTMENT, valueString: params.department },
  ];
  if (params.notes) extensions.push({ url: TRACKING_EXTENSIONS.NOTES, valueString: params.notes });
  if (params.roomNumber) extensions.push({ url: TRACKING_EXTENSIONS.ROOM_NUMBER, valueString: params.roomNumber });
  if (params.doctorName) extensions.push({ url: TRACKING_EXTENSIONS.DOCTOR_NAME, valueString: params.doctorName });
  if (params.estimatedDuration) extensions.push({ url: TRACKING_EXTENSIONS.ESTIMATED_DURATION, valueInteger: params.estimatedDuration });

  return {
    resourceType: 'Basic',
    code: {
      coding: [{ system: TRACKING_CODE_SYSTEM, code: TRACKING_CODE, display: 'Patient Tracking' }],
    },
    meta: {
      tag: [{ system: TRACKING_CODE_SYSTEM, code: TRACKING_CODE }],
    },
    extension: extensions,
  };
}

// ── Patient data ────────────────────────────────────────────────────

interface SeedPatient {
  patientName: string;
  phase: SurgicalPhase;
  department: Department;
  procedureType: ProcedureType;
  doctorName: string;
  roomNumber: string;
  estimatedDuration: number;
  notes: string;
}

const PATIENTS: SeedPatient[] = [
  // ── Interventional Cardiology (10) ──────────────────────────────
  // Registered (3-4)
  { patientName: 'გიორგი ბ.', phase: 'registered', department: 'interventional-cardiology', procedureType: 'cardiac', doctorName: 'დ. ჩხეიძე', roomNumber: '101', estimatedDuration: 90, notes: '' },
  { patientName: 'ნინო კ.', phase: 'registered', department: 'interventional-cardiology', procedureType: 'diagnostic', doctorName: 'დ. წერეთელი', roomNumber: '102', estimatedDuration: 45, notes: 'ალერგია პენიცილინზე' },
  { patientName: 'თამარ ჯ.', phase: 'registered', department: 'interventional-cardiology', procedureType: 'cardiac', doctorName: 'დ. ჩხეიძე', roomNumber: '103', estimatedDuration: 120, notes: '' },
  // Ongoing (4)
  { patientName: 'დავით მ.', phase: 'ongoing', department: 'interventional-cardiology', procedureType: 'cardiac', doctorName: 'დ. წერეთელი', roomNumber: '105-A', estimatedDuration: 150, notes: 'სტენტირება' },
  { patientName: 'ლევან შ.', phase: 'ongoing', department: 'interventional-cardiology', procedureType: 'diagnostic', doctorName: 'დ. ჩხეიძე', roomNumber: '106', estimatedDuration: 60, notes: 'კორონაროგრაფია' },
  { patientName: 'ეკა თ.', phase: 'ongoing', department: 'interventional-cardiology', procedureType: 'cardiac', doctorName: 'დ. წერეთელი', roomNumber: 'ICU-1', estimatedDuration: 180, notes: '' },
  { patientName: 'მარიამ დ.', phase: 'ongoing', department: 'interventional-cardiology', procedureType: 'cardiac', doctorName: 'დ. ჩხეიძე', roomNumber: '107', estimatedDuration: 90, notes: 'გადაუდებელი' },
  // Finished (3)
  { patientName: 'ზურაბ გ.', phase: 'finished', department: 'interventional-cardiology', procedureType: 'cardiac', doctorName: 'დ. წერეთელი', roomNumber: '108', estimatedDuration: 120, notes: '' },
  { patientName: 'ანა ხ.', phase: 'finished', department: 'interventional-cardiology', procedureType: 'diagnostic', doctorName: 'დ. ჩხეიძე', roomNumber: '109', estimatedDuration: 45, notes: 'დასრულდა წარმატებით' },
  { patientName: 'ირაკლი წ.', phase: 'finished', department: 'interventional-cardiology', procedureType: 'cardiac', doctorName: 'დ. წერეთელი', roomNumber: '110', estimatedDuration: 90, notes: '' },

  // ── Cardiac Surgery (10) ────────────────────────────────────────
  // Registered (3-4)
  { patientName: 'ნიკა პ.', phase: 'registered', department: 'cardiac-surgery', procedureType: 'surgery', doctorName: 'დ. გელაშვილი', roomNumber: '201', estimatedDuration: 240, notes: '' },
  { patientName: 'სოფო რ.', phase: 'registered', department: 'cardiac-surgery', procedureType: 'surgery', doctorName: 'დ. კაპანაძე', roomNumber: '202', estimatedDuration: 180, notes: 'შუნტირება' },
  { patientName: 'გიორგი ლ.', phase: 'registered', department: 'cardiac-surgery', procedureType: 'surgery', doctorName: 'დ. გელაშვილი', roomNumber: '203', estimatedDuration: 210, notes: '' },
  { patientName: 'მაია ზ.', phase: 'registered', department: 'cardiac-surgery', procedureType: 'diagnostic', doctorName: 'დ. კაპანაძე', roomNumber: '204', estimatedDuration: 60, notes: 'წინასაოპერაციო' },
  // Ongoing (4)
  { patientName: 'ალექსანდრე ნ.', phase: 'ongoing', department: 'cardiac-surgery', procedureType: 'surgery', doctorName: 'დ. გელაშვილი', roomNumber: '205-A', estimatedDuration: 240, notes: 'აორტის სარქველი' },
  { patientName: 'ნატო ბ.', phase: 'ongoing', department: 'cardiac-surgery', procedureType: 'surgery', doctorName: 'დ. კაპანაძე', roomNumber: 'ICU-2', estimatedDuration: 180, notes: '' },
  { patientName: 'თენგიზ ა.', phase: 'ongoing', department: 'cardiac-surgery', procedureType: 'surgery', doctorName: 'დ. გელაშვილი', roomNumber: '206', estimatedDuration: 200, notes: 'მიტრალური სარქველი' },
  { patientName: 'ქეთი მ.', phase: 'ongoing', department: 'cardiac-surgery', procedureType: 'cardiac', doctorName: 'დ. კაპანაძე', roomNumber: '207', estimatedDuration: 150, notes: '' },
  // Finished (2)
  { patientName: 'ვახტანგ ს.', phase: 'finished', department: 'cardiac-surgery', procedureType: 'surgery', doctorName: 'დ. გელაშვილი', roomNumber: '208', estimatedDuration: 210, notes: 'გადაყვანილია პალატაში' },
  { patientName: 'ლია კ.', phase: 'finished', department: 'cardiac-surgery', procedureType: 'surgery', doctorName: 'დ. კაპანაძე', roomNumber: '209', estimatedDuration: 180, notes: '' },

  // ── General Surgery (10) ────────────────────────────────────────
  // Registered (3)
  { patientName: 'ბესო ტ.', phase: 'registered', department: 'general-surgery', procedureType: 'surgery', doctorName: 'დ. ხარაიშვილი', roomNumber: '301', estimatedDuration: 90, notes: '' },
  { patientName: 'თინა ფ.', phase: 'registered', department: 'general-surgery', procedureType: 'endoscopy', doctorName: 'დ. მგელაძე', roomNumber: '302', estimatedDuration: 45, notes: 'გასტროსკოპია' },
  { patientName: 'გოჩა ვ.', phase: 'registered', department: 'general-surgery', procedureType: 'surgery', doctorName: 'დ. ხარაიშვილი', roomNumber: '303', estimatedDuration: 120, notes: '' },
  // Ongoing (4)
  { patientName: 'მანანა ე.', phase: 'ongoing', department: 'general-surgery', procedureType: 'surgery', doctorName: 'დ. მგელაძე', roomNumber: '305-A', estimatedDuration: 90, notes: 'აპენდექტომია' },
  { patientName: 'რევაზ ო.', phase: 'ongoing', department: 'general-surgery', procedureType: 'endoscopy', doctorName: 'დ. ხარაიშვილი', roomNumber: '306', estimatedDuration: 60, notes: '' },
  { patientName: 'ნანა ი.', phase: 'ongoing', department: 'general-surgery', procedureType: 'surgery', doctorName: 'დ. მგელაძე', roomNumber: '307', estimatedDuration: 150, notes: 'ქოლეცისტექტომია' },
  { patientName: 'ტარიელ ც.', phase: 'ongoing', department: 'general-surgery', procedureType: 'other', doctorName: 'დ. ხარაიშვილი', roomNumber: '308', estimatedDuration: 30, notes: '' },
  // Finished (3)
  { patientName: 'ცისანა უ.', phase: 'finished', department: 'general-surgery', procedureType: 'surgery', doctorName: 'დ. მგელაძე', roomNumber: '309', estimatedDuration: 120, notes: 'გაწერილია' },
  { patientName: 'შოთა ყ.', phase: 'finished', department: 'general-surgery', procedureType: 'endoscopy', doctorName: 'დ. ხარაიშვილი', roomNumber: '310', estimatedDuration: 45, notes: '' },
  { patientName: 'ხათუნა ძ.', phase: 'finished', department: 'general-surgery', procedureType: 'surgery', doctorName: 'დ. მგელაძე', roomNumber: '311', estimatedDuration: 90, notes: 'დასრულდა წარმატებით' },
];

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log('Authenticating with Medplum...');
  const loginResp = await medplum.startLogin({ email: EMAIL!, password: PASSWORD!, projectId: PROJECT_ID! });
  if (loginResp.code) {
    await medplum.processCode(loginResp.code);
  } else if (loginResp.memberships?.length) {
    const profileResp = await medplum.post('auth/profile', {
      login: loginResp.login,
      profile: loginResp.memberships[0].profile.reference,
    }) as { code: string };
    await medplum.processCode(profileResp.code);
  }
  console.log('Authenticated.');

  // 1. Delete existing tracking entries
  console.log('Searching for existing patient-tracking entries...');
  const existing = await medplum.searchResources('Basic', {
    _tag: `${TRACKING_CODE_SYSTEM}|${TRACKING_CODE}`,
    _count: '200',
  });
  console.log(`Found ${existing.length} existing entries. Deleting...`);

  for (const entry of existing) {
    if (entry.id) {
      await medplum.deleteResource('Basic', entry.id);
    }
  }
  console.log('All existing entries deleted.');

  // 2. Create 30 new patients
  console.log(`Creating ${PATIENTS.length} new patients...`);
  for (const p of PATIENTS) {
    const resource = buildBasicResource({
      code: generateCode(),
      patientName: p.patientName,
      phase: p.phase,
      procedureType: p.procedureType,
      department: p.department,
      notes: p.notes,
      roomNumber: p.roomNumber,
      doctorName: p.doctorName,
      estimatedDuration: p.estimatedDuration,
    });
    const created = await medplum.createResource(resource);
    console.log(`  Created: ${p.patientName} (${p.department}, ${p.phase}) -> ${created.id}`);
  }

  console.log(`\nDone! ${PATIENTS.length} patients seeded.`);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
