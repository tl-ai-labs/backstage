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
import Alert from '@material-ui/lab/Alert';
import AlertTitle from '@material-ui/lab/AlertTitle';
import { Alert as BuiAlert, ButtonIcon } from '@backstage/ui';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { RiCloseLine } from '@remixicon/react';
import { catalogReactTranslationRef } from '../../translation';

/**
 * Props for {@link EntityRenamedNotice}.
 *
 * @public
 */
export type EntityRenamedNoticeProps = {
  ui?: 'legacy' | 'bui';
};

/**
 * Notice displayed when an entity page is arrived at via a former-ref redirect.
 *
 * @public
 */
export function EntityRenamedNotice(
  props: EntityRenamedNoticeProps,
): JSX.Element | null {
  const { ui = 'legacy' } = props;
  const [dismissed, setDismissed] = useState(false);
  const location = useLocation();
  const { t } = useTranslationRef(catalogReactTranslationRef);

  const state = location.state as { formerEntityRef?: unknown } | null;
  const formerEntityRef =
    typeof state?.formerEntityRef === 'string' &&
    state.formerEntityRef.trim().length > 0
      ? state.formerEntityRef
      : undefined;

  if (!formerEntityRef || dismissed) {
    return null;
  }

  const title = t('entityRenamedNotice.title');
  const description = t('entityRenamedNotice.description', {
    formerEntityRef,
  });

  return ui === 'bui' ? (
    <BuiAlert
      status="info"
      title={title}
      description={description}
      customActions={
        <ButtonIcon
          aria-label="Dismiss"
          icon={<RiCloseLine />}
          size="small"
          onClick={() => setDismissed(true)}
        />
      }
    />
  ) : (
    <Alert severity="info" onClose={() => setDismissed(true)}>
      <AlertTitle>{title}</AlertTitle>
      {description}
    </Alert>
  );
}
