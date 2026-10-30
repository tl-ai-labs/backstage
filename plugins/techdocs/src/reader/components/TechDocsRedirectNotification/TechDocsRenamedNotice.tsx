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

import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { techdocsTranslationRef } from '../../../translation';
import { TechDocsRedirectNotification } from './TechDocsRedirectNotification';

/**
 * Displays a notification when the user was redirected to this documentation
 * page from an entity's former name.
 *
 * @internal
 */
export const TechDocsRenamedNotice = (): JSX.Element | null => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslationRef(techdocsTranslationRef);
  const activeFormerRef = useRef<string | null>(null);

  const formerRef = new URLSearchParams(location.search).get('renamedFrom');
  if (formerRef && !activeFormerRef.current) {
    activeFormerRef.current = formerRef;
  }

  useEffect(() => {
    if (formerRef) {
      const params = new URLSearchParams(location.search);
      params.delete('renamedFrom');
      const newSearch = params.toString();
      navigate(
        {
          pathname: location.pathname,
          search: newSearch ? `?${newSearch}` : '',
          hash: location.hash,
        },
        { replace: true },
      );
    }
  }, [formerRef, location, navigate]);

  if (!activeFormerRef.current) {
    return null;
  }

  return (
    <TechDocsRedirectNotification
      message={t('redirectNotification.renamedEntity', {
        formerRef: activeFormerRef.current,
      })}
      actionLabel={t('redirectNotification.dismiss')}
      autoHideDuration={10000}
      handleButtonClick={() => {}}
    />
  );
};
