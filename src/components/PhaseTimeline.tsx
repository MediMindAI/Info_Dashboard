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
 * A clean 3-step progress bar: Registered -> Ongoing -> Finished.
 * Uses a unified blue color family for all states:
 *   - Past steps: solid accent blue with check icon
 *   - Current step: accent blue with pulse animation
 *   - Future steps: gray border color
 */
export function PhaseTimeline({ currentPhase, compact }: PhaseTimelineProps): JSX.Element {
  const currentIdx = PHASES.indexOf(currentPhase);
  const dotSize = compact ? 24 : 30;

  return (
    <Group gap={0} wrap="nowrap" style={{ width: '100%' }}>
      {PHASES.map((phase, idx) => {
        const isPast = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isFinished = phase === 'finished' && currentPhase === 'finished';
        const isActive = isPast || isCurrent || isFinished;

        const dotBg = isActive ? 'var(--emr-accent)' : 'var(--emr-border-color)';
        const dotColor = isActive ? 'var(--emr-text-inverse)' : 'var(--emr-text-secondary)';

        const Icon = PHASE_ICONS[phase];
        const iconSize = compact ? 13 : 15;

        return (
          <Box
            key={phase}
            style={{
              flex: 1,
              minWidth: 0,
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
                  background: isPast || isCurrent ? 'var(--emr-accent)' : 'var(--emr-border-color)',
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
                boxShadow: isCurrent
                  ? '0 0 0 4px var(--emr-phase-glow)'
                  : isActive
                    ? '0 0 0 3px var(--emr-phase-glow-soft)'
                    : undefined,
                animation: isCurrent && !isFinished ? 'timelinePulse 2s ease-in-out infinite' : undefined,
                transition: 'all 0.3s ease',
              }}
            >
              {isPast || isFinished ? (
                <IconCheck size={iconSize} stroke={3} />
              ) : (
                <Icon size={iconSize} stroke={2} />
              )}
            </Box>

            {/* Label — always visible */}
            <Text
              size="xs"
              ta="center"
              mt={compact ? 3 : 6}
              fw={isCurrent ? 700 : 400}
              c={isActive ? 'var(--emr-accent)' : 'var(--emr-text-secondary)'}
              style={{
                fontSize: compact ? 'clamp(9px, 0.65vw, 13px)' : 'clamp(10px, 0.8vw, 16px)',
                lineHeight: 1.2,
                width: '100%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {t(`phase.${phase}`)}
            </Text>
          </Box>
        );
      })}

      <style>{`
        @keyframes timelinePulse {
          0%, 100% { box-shadow: 0 0 0 4px var(--emr-phase-glow); }
          50% { box-shadow: 0 0 0 8px var(--emr-phase-glow-soft); }
        }
      `}</style>
    </Group>
  );
}
