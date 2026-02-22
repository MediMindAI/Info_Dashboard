import { useEffect, useState, useCallback, useRef } from 'react';
import type { MedplumClient } from '@medplum/core';
import type { ResourceType } from '@medplum/fhirtypes';
import type { TrackingEntry } from '../types/tracking';
import { fetchAllEntries, TRACKING_CHANNEL_NAME } from '../services/trackingService';

/**
 * Polling hook that fetches tracking entries at a regular interval.
 * Also listens for cross-tab BroadcastChannel signals so the display
 * tab refreshes instantly when the admin tab makes a change.
 */
export function useTrackingData(
  medplum: MedplumClient | null,
  intervalMs: number = 15000
): {
  entries: TrackingEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [entries, setEntries] = useState<TrackingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Check if authenticated — this changes when MedplumProvider re-renders
  const isReady = !!medplum?.getProfile();

  const refresh = useCallback(async () => {
    if (!medplum || !isReady) return;
    try {
      const data = await fetchAllEntries(medplum);
      if (mountedRef.current) {
        setEntries(data);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [medplum, isReady]);

  useEffect(() => {
    mountedRef.current = true;
    refresh();

    // Poll on interval as fallback
    const timer = setInterval(refresh, intervalMs);

    // Listen for cross-tab "data changed" signals for instant updates
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(TRACKING_CHANNEL_NAME);
      channel.onmessage = () => {
        medplum?.invalidateSearches('Basic' as ResourceType);
        refresh();
      };
    } catch {
      // BroadcastChannel not supported — polling still works
    }

    return () => {
      mountedRef.current = false;
      clearInterval(timer);
      channel?.close();
    };
  }, [refresh, intervalMs]);

  return { entries, loading, error, refresh };
}
