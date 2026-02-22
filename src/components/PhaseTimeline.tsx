import { Group, Text, Box } from '@mantine/core';
import { IconCheck, IconClock, IconPlayerPlay, IconCircleCheck } from '@tabler/icons-react';
import type { SurgicalPhase } from '../types/tracking';
import { PHASES } from '../types/tracking';
import { t } from '../i18n';

interface PhaseTimelineProps {
  currentPhase: SurgicalPhase;
  compact?: boolean;
}

const PHASE_ICONS = {
  registered: IconClock,
  ongoing: IconPlayerPlay,
  finished: IconCircleCheck,
} as const;

/**
 * A clean 3-step progress bar: Registered → Ongoing → Finished.
 * Past steps are green with a checkmark, current pulses, future is gray.
 */
export function PhaseTimeline({ currentPhase, compact }: PhaseTimelineProps): JSX.Element {
  const currentIdx = PHASES.indexOf(currentPhase);
  const dotSize = compact ? 24 : 36;

  return (
    <Group gap={0} wrap="nowrap" style={{ width: '100%' }}>
      {PHASES.map((phase, idx) => {
        const isPast = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isFinished = phase === 'finished' && currentPhase === 'finished';

        let dotBg: string;
        let dotColor = 'white';
        if (isPast || isFinished) {
          dotBg = 'var(--emr-success)';
        } else if (isCurrent) {
          dotBg = phase === 'finished' ? 'var(--emr-success)' : 'var(--emr-accent)';
        } else {
          dotBg = 'var(--emr-border-color)';
          dotColor = 'var(--emr-text-secondary)';
        }

        const Icon = PHASE_ICONS[phase];
        const iconSize = compact ? 13 : 18;

        return (
          <Box
            key={phase}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            {/* Connecting line */}
            {idx > 0 && (
              <Box
                style={{
                  position: 'absolute',
                  top: dotSize / 2,
                  right: '50%',
                  width: '100%',
                  height: compact ? 2 : 3,
                  background: isPast || isCurrent ? 'var(--emr-success)' : 'var(--emr-border-color)',
                  zIndex: 0,
                  borderRadius: 2,
                }}
              />
            )}

            {/* Dot */}
            <Box
              style={{
                width: dotSize,
                height: dotSize,
                borderRadius: '50%',
                background: dotBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
                color: dotColor,
                fontWeight: 700,
                boxShadow: isCurrent && !isFinished
                  ? '0 0 0 4px rgba(49, 130, 206, 0.25)'
                  : isFinished
                    ? '0 0 0 4px rgba(34, 197, 94, 0.25)'
                    : undefined,
                animation: isCurrent ? 'pulse 2s infinite' : undefined,
              }}
            >
              {isPast || isFinished ? (
                <IconCheck size={iconSize} stroke={3} />
              ) : (
                <Icon size={iconSize} stroke={2} />
              )}
            </Box>

            {/* Label */}
            <Text
              size="xs"
              ta="center"
              mt={compact ? 3 : 6}
              fw={isCurrent ? 700 : 400}
              c={
                isCurrent
                  ? phase === 'finished' ? 'var(--emr-success)' : 'var(--emr-accent)'
                  : isPast
                    ? 'var(--emr-success)'
                    : 'var(--emr-text-secondary)'
              }
              style={{
                fontSize: compact ? 'var(--emr-font-xs)' : 'var(--emr-font-sm)',
                whiteSpace: 'nowrap',
                lineHeight: 1.2,
              }}
            >
              {t(`phase.${phase}`)}
            </Text>
          </Box>
        );
      })}

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(49, 130, 206, 0.25); }
          50% { box-shadow: 0 0 0 8px rgba(49, 130, 206, 0.08); }
        }
      `}</style>
    </Group>
  );
}
