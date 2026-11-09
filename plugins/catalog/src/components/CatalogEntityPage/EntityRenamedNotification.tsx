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

import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { catalogTranslationRef } from '../../alpha/translation';

/**
 * Extracts the former entity ref marker from location state if present.
 */
export function getRenamedFromEntityRef(state: unknown): string | undefined {
  if (
    typeof state === 'object' &&
    state !== null &&
    'renamedFromEntityRef' in state
  ) {
    const ref = (state as { renamedFromEntityRef?: unknown })
      .renamedFromEntityRef;
    if (typeof ref === 'string' && ref.length > 0) {
      return ref;
    }
  }
  return undefined;
}

/**
 * Notice shown when the user has been redirected from an entity's former ref.
 */
export function EntityRenamedNotification(): JSX.Element | null {
  const location = useLocation();
  const { t } = useTranslationRef(catalogTranslationRef);
  const [dismissed, setDismissed] = useState<string | undefined>();

  const formerRef = getRenamedFromEntityRef(location.state);

  if (!formerRef) {
    return null;
  }

  const open = formerRef !== dismissed;

  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert
        severity="info"
        onClose={() => setDismissed(formerRef)}
        closeText={t('entityPage.renamedNoticeDismiss')}
      >
        {t('entityPage.renamedNotice', { formerRef })}
      </Alert>
    </Snackbar>
  );
}
