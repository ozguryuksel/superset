/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { useMemo } from 'react';
import { MenuItem } from '@superset-ui/core/components/Menu';
import { t } from '@apache-superset/core/translation';
import { styled } from '@apache-superset/core/theme';
import { Icons } from '@superset-ui/core/components/Icons';
import { Typography } from '@superset-ui/core/components/Typography';

export interface Languages {
  [key: string]: {
    flag?: string;
    url?: string;
    name?: string;
  };
}

interface LanguagePickerProps {
  locale: string;
  languages: Languages;
}

const StyledLabel = styled.div`
  display: flex;
  align-items: center;
  line-height: ${({ theme }) => theme.sizeUnit * 5}px;

  & a {
    display: block;
    width: 150px;
    word-wrap: break-word;
    text-decoration: none;
  }
`;

const StyledLanguageTrigger = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: ${({ theme }) => theme.sizeUnit * 5}px;
  font-weight: ${({ theme }) => theme.fontWeightStrong};
  text-transform: uppercase;
`;

export const useLanguageMenuItems = ({
  locale,
  languages,
}: LanguagePickerProps): MenuItem =>
  useMemo(() => {
    const safeLanguages = languages ?? {};
    const languageEntries = Object.entries(safeLanguages).filter(
      ([, value]) => Boolean(value),
    );
    const normalizedLocaleKey =
      safeLanguages[locale] !== undefined
        ? locale
        : locale?.split('_')[0] || locale;
    const selectedLanguage =
      safeLanguages[normalizedLocaleKey] || languageEntries[0]?.[1];
    const selectedCode =
      normalizedLocaleKey ||
      languageEntries[0]?.[0] ||
      selectedLanguage?.name ||
      'en';

    const items: MenuItem[] = languageEntries.map(([langKey, language]) => ({
      key: langKey,
      label: (
        <StyledLabel>
          <Typography.Link href={language.url || '#'}>
            {language.name || langKey}
          </Typography.Link>
        </StyledLabel>
      ),
      style: { whiteSpace: 'normal', height: 'auto' },
    }));

    return {
      key: 'language-submenu',
      type: 'submenu' as const,
      label: (
        <StyledLanguageTrigger aria-label={t('Languages')}>
          {selectedCode}
        </StyledLanguageTrigger>
      ),
      icon: <Icons.CaretDownOutlined iconSize="xs" />,
      children: items,
      className: 'submenu-with-caret',
      popupClassName: 'language-picker-popup',
    };
  }, [languages, locale]);
