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

/** @internal */
export function useFormerEntityRef(): string | undefined {
  const state = useLocation().state as { formerEntityRef?: unknown } | null;
  const formerEntityRef = state?.formerEntityRef;
  return typeof formerEntityRef === 'string' ? formerEntityRef : undefined;
}

/** @internal */
export function EntityRenamedNotice(): JSX.Element | null {
  const formerEntityRef = useFormerEntityRef();
  const [open, setOpen] = useState(true);
  const { t } = useTranslationRef(catalogTranslationRef);

  if (!formerEntityRef || !open) {
    return null;
  }

  return (
    <Snackbar open anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
      <Alert severity="info" onClose={() => setOpen(false)}>
        {t('entityPage.renamedNotice', { formerEntityRef })}
      </Alert>
    </Snackbar>
  );
}
