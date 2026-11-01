/*
 * Copyright 2026 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSignal } from '@backstage/plugin-signals-react';
import throttle from 'lodash/throttle';

const ThrottleDelayMs = 2000;
const DefaultPollIntervalMs = 60_000;

/**
 * Drives a data hook's retry from notification signals, falling back to
 * polling when signals are unavailable. Refreshes share one throttle window
 * and never overlap.
 *
 * @internal
 */
export function useNotificationsRefresh(options: {
  loading: boolean;
  retry: () => void;
  pollIntervalMs?: number;
}): { requestRefresh: () => void } {
  const { loading, retry, pollIntervalMs = DefaultPollIntervalMs } = options;

  const { lastSignal, isSignalsAvailable } = useSignal('notifications');
  const [pending, setPending] = useState(false);

  const throttledSetPending = useMemo(
    () => throttle(setPending, ThrottleDelayMs),
    [],
  );

  useEffect(() => {
    return () => {
      throttledSetPending.cancel();
    };
  }, [throttledSetPending]);

  useEffect(() => {
    if (pending && !loading) {
      retry();
      setPending(false);
    }
  }, [pending, retry, loading]);

  useEffect(() => {
    if (lastSignal && lastSignal.action) {
      throttledSetPending(true);
    }
  }, [lastSignal, throttledSetPending]);

  useEffect(() => {
    if (isSignalsAvailable) {
      return undefined;
    }
    const interval = setInterval(() => {
      throttledSetPending(true);
    }, pollIntervalMs);
    return () => {
      clearInterval(interval);
    };
  }, [isSignalsAvailable, pollIntervalMs, throttledSetPending]);

  const requestRefresh = useCallback(() => {
    throttledSetPending(true);
  }, [throttledSetPending]);

  return { requestRefresh };
}
