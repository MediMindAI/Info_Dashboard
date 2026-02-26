import { useState, useEffect, useRef } from 'react';
import { Text, ActionIcon, Group, Loader, Center, Stack } from '@mantine/core';
import { useMantineColorScheme } from '@mantine/core';
import { useMedplum } from '@medplum/react';
import { IconSun, IconMoon, IconLanguage, IconHeartbeat, IconDoor, IconMaximize, IconMinimize, IconLayoutGrid, IconLayoutList, IconStethoscope, IconClock, IconTag } from '@tabler/icons-react';
import { useTrackingData } from '../hooks/useTrackingData';
import { useAutoFitDisplay } from '../hooks/useAutoFitDisplay';
import { PhaseTimeline } from './PhaseTimeline';
import { t, getLang, setLang } from '../i18n';
import { getConfig } from '../config';
import { getSettings } from '../services/settingsService';
import type { TrackingEntry, SurgicalPhase } from '../types/tracking';
import styles from './DisplayBoard.module.css';

type CardLayout = 'grid' | 'list';

const LAYOUT_STORAGE_KEY = 'display-board-layout';

/** Sort priority: ongoing first, then registered, then finished */
const PHASE_ORDER: Record<SurgicalPhase, number> = {
  ongoing: 0,
  registered: 1,
  finished: 2,
};

/**
 * The public TV display. Shows anonymous patient progress cards.
 * Auto-refreshes every 15 seconds. No login needed.
 * Completed patients auto-hide after 30 minutes.
 * Smart sorting: ongoing first, then registered, then finished.
 */
export function DisplayBoard(): JSX.Element {
  const medplum = useMedplum();
  const { entries, loading } = useTrackingData(medplum, 15_000);
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [clock, setClock] = useState(formatTime());
  const [lang, setLangState] = useState(getLang());
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [manualLayout, setManualLayout] = useState<CardLayout>(() => {
    const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
    return saved === 'list' ? 'list' : 'grid';
  });
  const [authState, setAuthState] = useState<'checking' | 'authenticated' | 'error'>('checking');
  const [authError, setAuthError] = useState('');
  const autoLoginAttempted = useRef(false);

  // Tick every second for live elapsed timers
  const [, setTick] = useState(0);

  // Auto-login on mount
  useEffect(() => {
    if (autoLoginAttempted.current) return;
    autoLoginAttempted.current = true;

    if (medplum.getProfile()) {
      setAuthState('authenticated');
      return;
    }

    const config = getConfig();
    if (!config.displayEmail || !config.displayPassword) {
      setAuthState('error');
      setAuthError('Display credentials not configured');
      return;
    }

    (async () => {
      try {
        const response = await medplum.startLogin({
          email: config.displayEmail,
          password: config.displayPassword,
          projectId: config.projectId,
        });

        if (response.code) {
          await medplum.processCode(response.code);
          setAuthState('authenticated');
        } else if (response.memberships && response.memberships.length > 0) {
          const profileResponse = await medplum.post('auth/profile', {
            login: response.login,
            profile: response.memberships[0].profile.reference,
          });
          if (profileResponse.code) {
            await medplum.processCode(profileResponse.code);
            setAuthState('authenticated');
          }
        }
      } catch (err) {
        setAuthState('error');
        setAuthError(err instanceof Error ? err.message : 'Auto-login failed');
      }
    })();
  }, [medplum]);

  // Live clock + elapsed timer tick (every second)
  useEffect(() => {
    const timer = setInterval(() => {
      setClock(formatTime());
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter completed > 30 min ago, then sort: ongoing → registered → finished
  const visible = entries
    .filter((e) => {
      if (e.currentPhase !== 'finished') return true;
      const completedAt = new Date(e.phaseUpdatedAt).getTime();
      return Date.now() - completedAt < 24 * 60 * 60 * 1000;
    })
    .sort((a, b) => {
      const orderDiff = PHASE_ORDER[a.currentPhase] - PHASE_ORDER[b.currentPhase];
      if (orderDiff !== 0) return orderDiff;
      // Within same phase, sort by most recently updated
      return new Date(b.phaseUpdatedAt).getTime() - new Date(a.phaseUpdatedAt).getTime();
    });

  // Group patients by department (preserving settings order, then any unseen depts)
  const savedDepts = getSettings().departments;
  const allDepts = [...new Set([...savedDepts, ...visible.map((e) => e.department)])];
  const deptGroups = allDepts
    .map((dept) => ({ dept, patients: visible.filter((e) => e.department === dept) }))
    .filter((g) => g.patients.length > 0);

  const deptInfo = deptGroups.map((g) => ({ dept: g.dept, count: g.patients.length }));
  const autoFit = useAutoFitDisplay(deptInfo, manualLayout);
  const { layout, currentPage, totalPages, currentDept, deptRange, deptTotal } = autoFit;

  // Find the current department's patients and slice to this page
  const currentGroup = deptGroups.find((g) => g.dept === currentDept);
  const pageEntries = currentGroup ? currentGroup.patients.slice(deptRange[0], deptRange[1]) : [];

  // Track fullscreen changes (e.g. user presses Escape)
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };

  const toggleLayout = () => {
    const next: CardLayout = manualLayout === 'grid' ? 'list' : 'grid';
    setManualLayout(next);
    localStorage.setItem(LAYOUT_STORAGE_KEY, next);
  };

  const toggleTheme = () => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
  const toggleLang = () => {
    const next = lang === 'ka' ? 'en' : 'ka';
    setLang(next);
    setLangState(next);
  };

  // Show connecting state while auto-logging in
  if (authState === 'checking') {
    return (
      <Center mih="100vh" style={{ background: 'var(--emr-bg-page)' }}>
        <Stack align="center" gap="md">
          <Loader size="xl" color="var(--emr-accent)" />
          <Text size="lg" c="var(--emr-text-secondary)">Connecting...</Text>
        </Stack>
      </Center>
    );
  }

  if (authState === 'error') {
    return (
      <Center mih="100vh" style={{ background: 'var(--emr-bg-page)' }}>
        <Stack align="center" gap="md">
          <IconHeartbeat size={64} stroke={1.5} color="var(--emr-text-secondary)" />
          <Text size="lg" c="var(--emr-error)">{authError}</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header bar */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <IconHeartbeat size={36} stroke={1.5} />
          <div>
            <h1 className={styles.title}>{t('app.title')}</h1>
            <div className={styles.subtitle}>{t('app.subtitle')}</div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <Group gap={8}>
            <ActionIcon variant="subtle" color="white" size="lg" onClick={toggleLayout} title={layout === 'grid' ? 'Card view' : 'List view'}>
              {layout === 'list' ? <IconLayoutList size={22} /> : <IconLayoutGrid size={22} />}
            </ActionIcon>
            <ActionIcon variant="subtle" color="white" size="lg" onClick={toggleLang}>
              <IconLanguage size={22} />
            </ActionIcon>
            <ActionIcon variant="subtle" color="white" size="lg" onClick={toggleTheme}>
              {colorScheme === 'dark' ? <IconSun size={22} /> : <IconMoon size={22} />}
            </ActionIcon>
            <ActionIcon variant="subtle" color="white" size="lg" onClick={toggleFullscreen}>
              {isFullscreen ? <IconMinimize size={22} /> : <IconMaximize size={22} />}
            </ActionIcon>
          </Group>
          <div className={styles.clock}>{clock}</div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <Center style={{ flex: 1 }}>
          <Loader size="xl" color="var(--emr-accent)" />
        </Center>
      ) : visible.length === 0 ? (
        <div className={styles.emptyState}>
          <IconHeartbeat size={80} stroke={1} color="var(--emr-text-secondary)" />
          <Text size="xl" mt="md" c="var(--emr-text-secondary)">
            {t('display.noPatients')}
          </Text>
        </div>
      ) : (
        <div className={styles.pageContent} key={currentPage}>
          <CardContent entries={pageEntries} layout={layout} dept={currentDept} deptTotal={deptTotal} />
        </div>
      )}

      {/* Page indicator dots (only when paginated) */}
      {totalPages > 1 && (
        <div className={styles.pageIndicator}>
          {Array.from({ length: totalPages }, (_, i) => (
            <span
              key={i}
              className={`${styles.pageDot} ${i === currentPage ? styles.pageDotActive : ''}`}
            />
          ))}
        </div>
      )}

      {/* Footer - refresh progress only */}
      <div className={styles.footer}>
        <div className={styles.refreshBar}>
          <div className={styles.refreshFill} key={clock} />
        </div>
      </div>
    </div>
  );
}

/** Renders a single department section with its patient cards */
function CardContent({
  entries,
  layout,
  dept,
  deptTotal,
}: {
  entries: TrackingEntry[];
  layout: CardLayout;
  dept: string;
  deptTotal: number;
}): JSX.Element {
  return (
    <div>
      <div className={styles.departmentSection}>
        <div className={styles.departmentHeader}>
          <span className={styles.departmentTitle}>{t(`department.${dept}`)}</span>
          <span className={styles.departmentCount}>{deptTotal}</span>
        </div>
        <div className={`${styles.grid} ${layout !== 'grid' ? styles[`layout_${layout}`] : ''}`}>
          {entries.map((entry) => (
            <PatientCard key={entry.id} entry={entry} layout={layout} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Individual patient card with live elapsed timer */
function PatientCard({ entry, layout }: { entry: TrackingEntry; layout: CardLayout }): JSX.Element {
  const elapsed = formatElapsed(entry.phaseUpdatedAt);
  const elapsedMs = Date.now() - new Date(entry.phaseUpdatedAt).getTime();

  // Progress calculation
  let progressPct: number | null = null;
  let remainingMin: number | null = null;
  if (entry.estimatedDuration && entry.currentPhase !== 'finished') {
    const totalMs = entry.estimatedDuration * 60_000;
    progressPct = Math.min(100, (elapsedMs / totalMs) * 100);
    remainingMin = Math.max(0, Math.ceil((totalMs - elapsedMs) / 60_000));
  }

  const isOvertime = progressPct !== null && progressPct >= 100;

  const isList = layout === 'list';

  const phaseClass = entry.currentPhase === 'finished'
    ? styles.cardFinished
    : entry.currentPhase === 'ongoing'
      ? styles.cardOngoing
      : '';

  const layoutClass = isList ? styles.card_list : '';

  // Shared pieces
  const nameBlock = (
    <div className={styles.cardIdentity}>
      {entry.patientName && (
        <span className={styles.patientName}>{entry.patientName}</span>
      )}
      <span className={styles.trackingCode}>{entry.code}</span>
    </div>
  );

  const procedureChip = (
    <span className={`${styles.infoChip} ${styles.chipProcedure}`}>
      <IconTag size={13} />
      {entry.procedureType}
    </span>
  );

  const roomChip = entry.roomNumber ? (
    <span className={styles.infoChip}>
      <IconDoor size={13} />
      {entry.roomNumber}
    </span>
  ) : null;

  const doctorChip = entry.doctorName ? (
    <span className={styles.infoChip}>
      <IconStethoscope size={13} />
      {entry.doctorName}
    </span>
  ) : null;

  const timeBlock = (
    <div className={styles.timeBlock}>
      <span className={styles.timeDisplay}>
        <IconClock size={isList ? 16 : 14} />
        {elapsed}
      </span>
      {remainingMin !== null && remainingMin > 0 && (
        <span className={styles.remainingBadge}>
          ~{remainingMin} {t('display.min')} {t('display.remaining')}
        </span>
      )}
    </div>
  );

  const progressBar = progressPct !== null ? (
    <div className={styles.progressBar}>
      <div
        className={styles.progressFill}
        style={{ width: `${progressPct}%` }}
      />
    </div>
  ) : null;

  const timeline = (
    <div className={styles.cardTimeline}>
      <PhaseTimeline currentPhase={entry.currentPhase} compact={isList} />
    </div>
  );

  /* ---- LIST layout: 3 horizontal zones ---- */
  if (isList) {
    return (
      <div className={`${styles.card} ${phaseClass} ${layoutClass}`}>
        <div className={styles.cardLeft}>
          {nameBlock}
        </div>
        <div className={styles.cardCenter}>
          {procedureChip}
          {roomChip}
          {doctorChip}
        </div>
        <div className={styles.cardRight}>
          {timeBlock}
          {progressBar}
          {timeline}
        </div>
      </div>
    );
  }

  /* ---- GRID layout: stacked sections ---- */
  return (
    <div className={`${styles.card} ${phaseClass}`}>
      <div className={styles.cardTop}>
        {nameBlock}
        {procedureChip}
      </div>
      <div className={styles.cardInfoRow}>
        {roomChip}
        {doctorChip}
        {timeBlock}
      </div>
      <div className={styles.cardBottomSection}>
        {progressBar}
        {timeline}
      </div>
    </div>
  );
}

function formatTime(): string {
  return new Date().toLocaleTimeString('ka-GE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/** Format elapsed time as "1h 23m" for display */
function formatElapsed(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const totalMins = Math.floor(diff / 60_000);
  if (totalMins < 1) return '< 1m';
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}
