import { useState, useEffect } from 'react';
import {
  Button,
  Group,
  Text,
  Modal,
  ActionIcon,
  Badge,
  Loader,
  Center,
  Stack,
  Tooltip,
} from '@mantine/core';
import { EMRTextInput, EMRPasswordInput, EMRSelect, EMRTextarea, EMRNumberInput } from './ui/EMRFormFields';
import { useMantineColorScheme } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMedplum } from '@medplum/react';
import {
  IconPlus,
  IconPlayerTrackNext,
  IconTrash,
  IconEdit,
  IconSun,
  IconMoon,
  IconLanguage,
  IconHeartbeat,
  IconSearch,
  IconLogout,
  IconClock,
  IconUser,
  IconDoor,
  IconStethoscope,
  IconNotes,
  IconActivity,
} from '@tabler/icons-react';
import { useTrackingData } from '../hooks/useTrackingData';
import { PhaseTimeline } from './PhaseTimeline';
import { createEntry, advancePhase, deleteEntry, updateEntry } from '../services/trackingService';
import { PROCEDURE_TYPES, PHASES } from '../types/tracking';
import type { ProcedureType, SurgicalPhase, TrackingEntry } from '../types/tracking';
import { t, getLang, setLang } from '../i18n';
import { getConfig } from '../config';
import styles from './StaffPanel.module.css';

/**
 * Staff admin panel for managing patient tracking entries.
 * Features: summary stats, search/filter, phase-colored table, enriched modal.
 */
export function StaffPanel(): JSX.Element {
  const medplum = useMedplum();
  const profile = medplum.getProfile();
  const { entries, loading, refresh } = useTrackingData(medplum, 30_000);
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [lang, setLangState] = useState(getLang());

  // Add modal state
  const [addOpen, setAddOpen] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newProcedure, setNewProcedure] = useState<ProcedureType>('surgery');
  const [newNotes, setNewNotes] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const [newDoctor, setNewDoctor] = useState('');
  const [newDuration, setNewDuration] = useState<number | string>('');
  const [submitting, setSubmitting] = useState(false);

  // Edit modal state
  const [editEntry, setEditEntry] = useState<TrackingEntry | null>(null);
  const [editName, setEditName] = useState('');
  const [editProcedure, setEditProcedure] = useState<ProcedureType>('surgery');
  const [editNotes, setEditNotes] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [editDoctor, setEditDoctor] = useState('');
  const [editDuration, setEditDuration] = useState<number | string>('');
  const [editPhase, setEditPhase] = useState<SurgicalPhase>('registered');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Search & filter
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<SurgicalPhase | 'all'>('all');

  // Elapsed time tick - re-render every 30s to update elapsed times
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      setLoginError('Email and password are required');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    try {
      const config = getConfig();
      const response = await medplum.startLogin({
        email: loginEmail,
        password: loginPassword,
        projectId: config.projectId,
      });

      if (response.code) {
        await medplum.processCode(response.code);
      } else if (response.memberships && response.memberships.length > 0) {
        const profileResponse = await medplum.post('auth/profile', {
          login: response.login,
          profile: response.memberships[0].profile.reference,
        });
        if (profileResponse.code) {
          await medplum.processCode(profileResponse.code);
        }
      }
      // Login succeeded — clear the logout flag so admin panel shows
      localStorage.removeItem('adminLoggedOut');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  // If not logged in or admin explicitly logged out, show login form
  if (!profile || localStorage.getItem('adminLoggedOut') === 'true') {
    return (
      <Center mih="100vh" style={{ background: 'var(--emr-bg-page)' }}>
        <Stack align="center" gap="lg" style={{ width: 340 }}>
          <IconHeartbeat size={64} stroke={1.5} color="var(--emr-accent)" />
          <Text size="xl" fw={700} c="var(--emr-text-primary)">MediMind Info Display</Text>
          <Text c="var(--emr-text-secondary)">{t('admin.title')}</Text>
          <EMRTextInput
            label="Email"
            placeholder="name@domain.com"
            value={loginEmail}
            onChange={setLoginEmail}
            style={{ width: '100%' }}
          />
          <EMRPasswordInput
            label="Password"
            placeholder="Enter password"
            value={loginPassword}
            onChange={setLoginPassword}
            style={{ width: '100%' }}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          {loginError && (
            <Text c="red" size="sm">{loginError}</Text>
          )}
          <Button
            size="lg"
            fullWidth
            style={{ background: 'var(--emr-gradient-primary)' }}
            onClick={handleLogin}
            loading={loginLoading}
          >
            Sign In
          </Button>
        </Stack>
      </Center>
    );
  }

  // ── Handlers ────────────────────────────────────────────────

  const handleAdd = async () => {
    setSubmitting(true);
    try {
      await createEntry(medplum, {
        patientName: newPatientName,
        procedureType: newProcedure,
        notes: newNotes,
        roomNumber: newRoom,
        doctorName: newDoctor,
        estimatedDuration: typeof newDuration === 'number' ? newDuration : null,
      });
      notifications.show({ title: 'Success', message: 'Patient added', color: 'green' });
      setAddOpen(false);
      setNewPatientName('');
      setNewNotes('');
      setNewRoom('');
      setNewDoctor('');
      setNewDuration('');
      await refresh();
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdvance = async (entry: TrackingEntry) => {
    try {
      await advancePhase(medplum, entry);
      await refresh();
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed',
        color: 'red',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('admin.confirmDelete'))) return;
    try {
      await deleteEntry(medplum, id);
      await refresh();
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed',
        color: 'red',
      });
    }
  };

  const openEdit = (entry: TrackingEntry) => {
    setEditEntry(entry);
    setEditName(entry.patientName);
    setEditProcedure(entry.procedureType);
    setEditNotes(entry.notes);
    setEditRoom(entry.roomNumber);
    setEditDoctor(entry.doctorName);
    setEditDuration(entry.estimatedDuration ?? '');
    setEditPhase(entry.currentPhase);
  };

  const handleEdit = async () => {
    if (!editEntry) return;
    setEditSubmitting(true);
    try {
      const phaseChanged = editPhase !== editEntry.currentPhase;
      await updateEntry(medplum, editEntry.id, {
        patientName: editName,
        procedureType: editProcedure,
        notes: editNotes,
        roomNumber: editRoom,
        doctorName: editDoctor,
        estimatedDuration: typeof editDuration === 'number' ? editDuration : null,
        phase: phaseChanged ? editPhase : undefined,
      });
      notifications.show({ title: 'Success', message: 'Patient updated', color: 'green' });
      setEditEntry(null);
      await refresh();
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed',
        color: 'red',
      });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleLogout = () => {
    medplum.clear();
    localStorage.setItem('adminLoggedOut', 'true');
    window.location.href = '/admin';
  };

  const toggleTheme = () => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
  const toggleLang = () => {
    const next = lang === 'ka' ? 'en' : 'ka';
    setLang(next);
    setLangState(next);
  };

  const procedureOptions = PROCEDURE_TYPES.map((p) => ({
    value: p,
    label: t(`procedure.${p}`),
  }));

  // ── Stats ───────────────────────────────────────────────────

  const counts = { registered: 0, ongoing: 0, finished: 0 };
  for (const e of entries) {
    counts[e.currentPhase]++;
  }

  // ── Filtered entries ────────────────────────────────────────

  const filtered = entries.filter((e) => {
    if (phaseFilter !== 'all' && e.currentPhase !== phaseFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.patientName.toLowerCase().includes(q) ||
        e.code.toLowerCase().includes(q) ||
        e.doctorName.toLowerCase().includes(q) ||
        e.roomNumber.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className={styles.page}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <IconHeartbeat size={30} stroke={1.5} />
          <div>
            <h1 className={styles.headerTitle}>{t('admin.title')}</h1>
            <div className={styles.headerSubtitle}>{t('admin.subtitle')}</div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <ActionIcon variant="subtle" color="white" size="lg" onClick={toggleLang}>
            <IconLanguage size={20} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="white" size="lg" onClick={toggleTheme}>
            {colorScheme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
          </ActionIcon>
          <Button
            leftSection={<IconPlus size={16} />}
            variant="white"
            color="dark"
            size="compact-sm"
            styles={{ root: { fontWeight: 600 }, label: { overflow: 'visible', height: 'auto' } }}
            onClick={() => setAddOpen(true)}
          >
            {t('admin.addPatient')}
          </Button>
          <Tooltip label={t('admin.logout')}>
            <ActionIcon variant="subtle" color="white" size="lg" onClick={handleLogout}>
              <IconLogout size={20} />
            </ActionIcon>
          </Tooltip>
        </div>
      </div>

      {/* ── Stats Strip ────────────────────────────────────── */}
      <div className={styles.statsStrip}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconRegistered}`}>
            <IconClock size={22} />
          </div>
          <div>
            <div className={styles.statValue}>{counts.registered}</div>
            <div className={styles.statLabel}>{t('admin.stats.registered')}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconOngoing}`}>
            <IconStethoscope size={22} />
          </div>
          <div>
            <div className={styles.statValue}>{counts.ongoing}</div>
            <div className={styles.statLabel}>{t('admin.stats.ongoing')}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconFinished}`}>
            <IconUser size={22} />
          </div>
          <div>
            <div className={styles.statValue}>{counts.finished}</div>
            <div className={styles.statLabel}>{t('admin.stats.finished')}</div>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ─────────────────────────────────────── */}
      <div className={styles.filterBar}>
        <EMRTextInput
          className={styles.searchInput}
          placeholder={t('admin.search')}
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={setSearch}
          size="sm"
        />
        <div className={styles.filterChips}>
          {(['all', 'registered', 'ongoing', 'finished'] as const).map((phase) => (
            <button
              key={phase}
              className={`${styles.filterChip} ${phaseFilter === phase ? styles.filterChipActive : ''}`}
              onClick={() => setPhaseFilter(phase)}
            >
              {phase === 'all' ? t('admin.filterAll') : t(`phase.${phase}`)}
              {phase !== 'all' && ` (${counts[phase]})`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────── */}
      <div className={styles.tableWrapper}>
        {loading ? (
          <Center py={80}>
            <Loader color="var(--emr-accent)" />
          </Center>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <IconHeartbeat size={60} stroke={1} className={styles.emptyIcon} />
            <Text size="lg" c="var(--emr-text-secondary)">{t('admin.noPatients')}</Text>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('admin.code')}</th>
                <th>{t('admin.patient')}</th>
                <th>{t('admin.procedure')}</th>
                <th>{t('admin.room')}</th>
                <th>{t('admin.doctor')}</th>
                <th style={{ minWidth: 180 }}>{t('admin.phase')}</th>
                <th>{t('admin.elapsed')}</th>
                <th>{t('admin.estimatedDuration')}</th>
                <th>{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => {
                const elapsed = formatElapsed(entry.phaseUpdatedAt);
                const elapsedMs = Date.now() - new Date(entry.phaseUpdatedAt).getTime();
                const progressPct = entry.estimatedDuration
                  ? Math.min(100, (elapsedMs / (entry.estimatedDuration * 60_000)) * 100)
                  : null;
                const isOvertime = progressPct !== null && progressPct >= 100;

                return (
                  <tr
                    key={entry.id}
                    className={
                      entry.currentPhase === 'registered' ? styles.rowRegistered
                        : entry.currentPhase === 'ongoing' ? styles.rowOngoing
                        : styles.rowFinished
                    }
                  >
                    <td className={styles.codeCell}>{entry.code}</td>
                    <td>
                      <Text fw={500}>{entry.patientName || '—'}</Text>
                    </td>
                    <td>
                      <Badge variant="light" color="blue" size="sm">
                        {t(`procedure.${entry.procedureType}`)}
                      </Badge>
                    </td>
                    <td>
                      {entry.roomNumber ? (
                        <Group gap={4} wrap="nowrap">
                          <IconDoor size={14} color="var(--emr-text-secondary)" />
                          <Text size="sm">{entry.roomNumber}</Text>
                        </Group>
                      ) : (
                        <Text size="sm" c="dimmed">—</Text>
                      )}
                    </td>
                    <td>
                      <Text size="sm">{entry.doctorName || '—'}</Text>
                    </td>
                    <td>
                      <PhaseTimeline currentPhase={entry.currentPhase} compact />
                    </td>
                    <td>
                      <Text
                        size="sm"
                        fw={500}
                        c={isOvertime ? 'var(--emr-error)' : 'var(--emr-text-primary)'}
                        className={styles.elapsedCell}
                      >
                        {elapsed}
                      </Text>
                    </td>
                    <td>
                      {entry.estimatedDuration ? (
                        <div>
                          <Text size="xs" c="var(--emr-text-secondary)">
                            {entry.estimatedDuration} {t('display.min')}
                          </Text>
                          <div className={styles.durationBar}>
                            <div
                              className={styles.durationFill}
                              style={{
                                width: `${progressPct}%`,
                                background: isOvertime
                                  ? 'var(--emr-error)'
                                  : progressPct! > 75
                                    ? 'var(--emr-warning)'
                                    : 'var(--emr-success)',
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <Text size="sm" c="dimmed">—</Text>
                      )}
                    </td>
                    <td>
                      <Group gap={4} wrap="nowrap">
                        {entry.currentPhase !== 'finished' && (
                          <Tooltip label={t('admin.advance')}>
                            <ActionIcon
                              variant="light"
                              color="blue"
                              size="sm"
                              onClick={() => handleAdvance(entry)}
                            >
                              <IconPlayerTrackNext size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        <Tooltip label={t('admin.edit')}>
                          <ActionIcon
                            variant="light"
                            color="gray"
                            size="sm"
                            onClick={() => openEdit(entry)}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label={t('admin.delete')}>
                          <ActionIcon
                            variant="light"
                            color="red"
                            size="sm"
                            onClick={() => handleDelete(entry.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Add Patient Modal ──────────────────────────────── */}
      <Modal
        opened={addOpen}
        onClose={() => setAddOpen(false)}
        centered
        size="xl"
        withCloseButton={false}
        padding={0}
        radius="lg"
        styles={{
          content: { background: 'var(--emr-bg-modal)', overflow: 'hidden' },
        }}
      >
        <div style={{ padding: '24px 28px 20px' }}>
          {/* ── Header banner ─────────────────────────── */}
          <div className={styles.editModalHeader}>
            <div className={styles.editModalHeaderIcon}>
              <IconPlus size={26} stroke={1.5} />
            </div>
            <div className={styles.editModalHeaderInfo}>
              <div className={styles.editModalHeaderName}>
                {t('admin.addPatient')}
              </div>
            </div>
            <span className={styles.editModalHeaderBadge}>
              {t(`procedure.${newProcedure}`)}
            </span>
            <ActionIcon
              variant="subtle"
              color="white"
              size="lg"
              onClick={() => setAddOpen(false)}
              style={{ flexShrink: 0 }}
            >
              <IconPlus size={20} style={{ transform: 'rotate(45deg)' }} />
            </ActionIcon>
          </div>

          {/* ── Section: Patient Info ─────────────────── */}
          <div className={styles.editSection}>
            <div className={styles.editSectionLabel}>
              <IconUser size={15} />
              {t('admin.section.patientInfo')}
            </div>
            <div className={styles.editFieldGrid}>
              <EMRTextInput
                label={t('admin.patientName')}
                placeholder={t('admin.patientNamePlaceholder')}
                value={newPatientName}
                onChange={setNewPatientName}
                required
                leftSection={<IconUser size={16} />}
              />
              <EMRSelect
                label={t('admin.procedure')}
                data={procedureOptions}
                value={newProcedure}
                onChange={(val) => val && setNewProcedure(val as ProcedureType)}
              />
            </div>
          </div>

          {/* ── Section: Assignment ───────────────────── */}
          <div className={styles.editSection}>
            <div className={styles.editSectionLabel}>
              <IconStethoscope size={15} />
              {t('admin.section.assignment')}
            </div>
            <div className={styles.editFieldGrid}>
              <EMRTextInput
                label={t('admin.room')}
                placeholder={t('admin.roomPlaceholder')}
                value={newRoom}
                onChange={setNewRoom}
                leftSection={<IconDoor size={16} />}
              />
              <EMRTextInput
                label={t('admin.doctor')}
                placeholder={t('admin.doctorPlaceholder')}
                value={newDoctor}
                onChange={setNewDoctor}
                leftSection={<IconStethoscope size={16} />}
              />
              <EMRNumberInput
                label={t('admin.estimatedDuration')}
                placeholder={t('admin.estimatedDurationPlaceholder')}
                value={newDuration}
                onChange={setNewDuration}
                min={1}
                max={600}
                leftSection={<IconClock size={16} />}
                suffix={` ${t('display.min')}`}
              />
            </div>
          </div>

          {/* ── Section: Notes ────────────────────────── */}
          <div className={styles.editSection} style={{ marginBottom: 0 }}>
            <div className={styles.editSectionLabel}>
              <IconNotes size={15} />
              {t('admin.section.notes')}
            </div>
            <EMRTextarea
              placeholder="Staff-only notes..."
              value={newNotes}
              onChange={setNewNotes}
              rows={3}
              autosize
              minRows={2}
              maxRows={5}
            />
          </div>

          {/* ── Footer ────────────────────────────────── */}
          <div className={styles.editFooter}>
            <Button variant="default" size="md" onClick={() => setAddOpen(false)}>
              {t('admin.cancel')}
            </Button>
            <Button
              size="md"
              style={{ background: 'var(--emr-gradient-primary)' }}
              onClick={handleAdd}
              loading={submitting}
              disabled={!newPatientName.trim()}
            >
              {t('admin.addPatient')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Edit Patient Modal (XL) ──────────────────────── */}
      <Modal
        opened={!!editEntry}
        onClose={() => setEditEntry(null)}
        centered
        size="xl"
        withCloseButton={false}
        padding={0}
        radius="lg"
        styles={{
          content: { background: 'var(--emr-bg-modal)', overflow: 'hidden' },
        }}
      >
        <div style={{ padding: '24px 28px 20px' }}>
          {/* ── Header banner ─────────────────────────── */}
          <div className={styles.editModalHeader}>
            <div className={styles.editModalHeaderIcon}>
              <IconEdit size={26} stroke={1.5} />
            </div>
            <div className={styles.editModalHeaderInfo}>
              <div className={styles.editModalHeaderName}>
                {editEntry?.patientName || t('admin.editPatient')}
              </div>
              <div className={styles.editModalHeaderCode}>
                {editEntry?.code}
              </div>
            </div>
            <span className={styles.editModalHeaderBadge}>
              {t(`procedure.${editEntry?.procedureType ?? 'surgery'}`)}
            </span>
            <ActionIcon
              variant="subtle"
              color="white"
              size="lg"
              onClick={() => setEditEntry(null)}
              style={{ flexShrink: 0 }}
            >
              <IconPlus size={20} style={{ transform: 'rotate(45deg)' }} />
            </ActionIcon>
          </div>

          {/* ── Section: Patient Info ─────────────────── */}
          <div className={styles.editSection}>
            <div className={styles.editSectionLabel}>
              <IconUser size={15} />
              {t('admin.section.patientInfo')}
            </div>
            <div className={styles.editFieldGrid}>
              <EMRTextInput
                label={t('admin.patientName')}
                placeholder={t('admin.patientNamePlaceholder')}
                value={editName}
                onChange={setEditName}
                required
                leftSection={<IconUser size={16} />}
              />
              <EMRSelect
                label={t('admin.procedure')}
                data={procedureOptions}
                value={editProcedure}
                onChange={(val) => val && setEditProcedure(val as ProcedureType)}
              />
            </div>
          </div>

          {/* ── Section: Assignment ───────────────────── */}
          <div className={styles.editSection}>
            <div className={styles.editSectionLabel}>
              <IconStethoscope size={15} />
              {t('admin.section.assignment')}
            </div>
            <div className={styles.editFieldGrid}>
              <EMRTextInput
                label={t('admin.room')}
                placeholder={t('admin.roomPlaceholder')}
                value={editRoom}
                onChange={setEditRoom}
                leftSection={<IconDoor size={16} />}
              />
              <EMRTextInput
                label={t('admin.doctor')}
                placeholder={t('admin.doctorPlaceholder')}
                value={editDoctor}
                onChange={setEditDoctor}
                leftSection={<IconStethoscope size={16} />}
              />
              <EMRNumberInput
                label={t('admin.estimatedDuration')}
                placeholder={t('admin.estimatedDurationPlaceholder')}
                value={editDuration}
                onChange={setEditDuration}
                min={1}
                max={600}
                leftSection={<IconClock size={16} />}
                suffix={` ${t('display.min')}`}
              />
            </div>
          </div>

          {/* ── Section: Status / Phase ───────────────── */}
          <div className={styles.editSection}>
            <div className={styles.editSectionLabel}>
              <IconActivity size={15} />
              {t('admin.section.status')}
            </div>
            <div className={styles.phaseSelector}>
              {PHASES.map((phase) => {
                const isActive = editPhase === phase;
                const dotColor =
                  phase === 'registered' ? 'var(--emr-accent)'
                    : phase === 'ongoing' ? 'var(--emr-warning)'
                    : 'var(--emr-success)';
                return (
                  <button
                    key={phase}
                    type="button"
                    className={`${styles.phaseOption} ${isActive ? styles.phaseOptionActive : ''}`}
                    onClick={() => setEditPhase(phase)}
                    style={isActive ? { borderColor: dotColor } : undefined}
                  >
                    <span
                      className={styles.phaseOptionDot}
                      style={{ background: dotColor }}
                    />
                    <span className={styles.phaseOptionLabel}>
                      {t(`phase.${phase}`)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Section: Notes ────────────────────────── */}
          <div className={styles.editSection} style={{ marginBottom: 0 }}>
            <div className={styles.editSectionLabel}>
              <IconNotes size={15} />
              {t('admin.section.notes')}
            </div>
            <EMRTextarea
              placeholder="Staff-only notes..."
              value={editNotes}
              onChange={setEditNotes}
              rows={3}
              autosize
              minRows={2}
              maxRows={5}
            />
          </div>

          {/* ── Footer ────────────────────────────────── */}
          <div className={styles.editFooter}>
            <Button variant="default" size="md" onClick={() => setEditEntry(null)}>
              {t('admin.cancel')}
            </Button>
            <Button
              size="md"
              style={{ background: 'var(--emr-gradient-primary)' }}
              onClick={handleEdit}
              loading={editSubmitting}
              disabled={!editName.trim()}
            >
              {t('admin.save')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/** Format elapsed time as "1h 23m" or "5m" */
function formatElapsed(iso: string): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const totalMins = Math.floor(diff / 60_000);
  if (totalMins < 1) return '< 1m';
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}
