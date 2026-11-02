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
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { Alert, Button } from '@backstage/ui';
import { catalogReactTranslationRef } from '../../translation';

function RenamedNotice(props: { formerName: string }) {
  const { formerName } = props;
  const location = useLocation();
  const [dismissedKey, setDismissedKey] = useState<string | undefined>();
  const { t } = useTranslationRef(catalogReactTranslationRef);

  if (dismissedKey === location.key) {
    return null;
  }

  return (
    <Alert
      status="info"
      icon
      mb="4"
      title={t('entityRenamedNotice.title', { formerName })}
      customActions={
        <Button
          size="small"
          variant="tertiary"
          onPress={() => setDismissedKey(location.key)}
        >
          {t('entityRenamedNotice.dismiss')}
        </Button>
      }
    />
  );
}

/**
 * Shows a dismissible notice when the user was redirected from a former name
 * of the entity. The notice is driven by in-app navigation state only.
 *
 * @public
 */
export function EntityRenamedNotice() {
  const location = useLocation();
  const formerName = (location.state as { entityRenamedFrom?: unknown } | null)
    ?.entityRenamedFrom;

  if (typeof formerName !== 'string') {
    return null;
  }

  return <RenamedNotice formerName={formerName} />;
}
