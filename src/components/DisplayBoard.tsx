import { useState, useEffect, useRef } from 'react';
import { Text, ActionIcon, Group, Loader, Center, Stack } from '@mantine/core';
import { useMantineColorScheme } from '@mantine/core';
import { useMedplum } from '@medplum/react';
import { IconSun, IconMoon, IconLanguage, IconHeartbeat, IconDoor } from '@tabler/icons-react';
import { useTrackingData } from '../hooks/useTrackingData';
import { PhaseTimeline } from './PhaseTimeline';
import { t, getLang, setLang } from '../i18n';
import { getConfig } from '../config';
import type { TrackingEntry, SurgicalPhase } from '../types/tracking';
import styles from './DisplayBoard.module.css';

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
      return Date.now() - completedAt < 30 * 60 * 1000;
    })
    .sort((a, b) => {
      const orderDiff = PHASE_ORDER[a.currentPhase] - PHASE_ORDER[b.currentPhase];
      if (orderDiff !== 0) return orderDiff;
      // Within same phase, sort by most recently updated
      return new Date(b.phaseUpdatedAt).getTime() - new Date(a.phaseUpdatedAt).getTime();
    });

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
            <ActionIcon variant="subtle" color="white" size="lg" onClick={toggleLang}>
              <IconLanguage size={22} />
            </ActionIcon>
            <ActionIcon variant="subtle" color="white" size="lg" onClick={toggleTheme}>
              {colorScheme === 'dark' ? <IconSun size={22} /> : <IconMoon size={22} />}
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
        <div className={styles.grid}>
          {visible.map((entry) => (
            <PatientCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className={styles.footer}>
        {t('display.lastUpdate')}: {clock}
      </div>
    </div>
  );
}

/** Individual patient card with live elapsed timer */
function PatientCard({ entry }: { entry: TrackingEntry }): JSX.Element {
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

  return (
    <div
      className={`${styles.card} ${
        entry.currentPhase === 'finished'
          ? styles.cardFinished
          : entry.currentPhase === 'ongoing'
            ? styles.cardOngoing
            : ''
      }`}
    >
      <div className={styles.cardTop}>
        <div className={styles.cardInfo}>
          {entry.patientName && (
            <span className={styles.patientName}>{entry.patientName}</span>
          )}
          <span className={styles.trackingCode}>{entry.code}</span>
        </div>
        <span className={`${styles.procedureBadge} ${styles[`badge_${entry.currentPhase}`]}`}>
          {t(`procedure.${entry.procedureType}`)}
        </span>
      </div>

      {/* Meta row: room + elapsed time */}
      <div className={styles.cardMeta}>
        {entry.roomNumber && (
          <div className={styles.cardMetaItem}>
            <IconDoor size={14} />
            <span>{entry.roomNumber}</span>
          </div>
        )}
        <div className={`${styles.cardMetaItem} ${isOvertime ? styles.overtime : ''}`}>
          <span className={styles.elapsedTime}>{elapsed}</span>
        </div>
        {remainingMin !== null && remainingMin > 0 && (
          <div className={styles.cardMetaItem}>
            <span className={styles.remainingText}>
              ~{remainingMin} {t('display.min')} {t('display.remaining')}
            </span>
          </div>
        )}
      </div>

      {/* Progress bar (only if estimated duration is set) */}
      {progressPct !== null && (
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{
              width: `${progressPct}%`,
              background: isOvertime
                ? 'var(--emr-error)'
                : progressPct > 75
                  ? 'var(--emr-warning)'
                  : 'linear-gradient(90deg, #22c55e, #4ade80)',
            }}
          />
        </div>
      )}

      <div className={styles.cardTimeline}>
        <PhaseTimeline currentPhase={entry.currentPhase} />
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
