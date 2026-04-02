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
import { useState, useEffect, FC, PureComponent, useMemo } from 'react';
import { Global } from '@emotion/react';
import rison from 'rison';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useQueryParams, BooleanParam } from 'use-query-params';
import { isEmpty } from 'lodash';
import { t } from '@apache-superset/core/translation';
import {
  SupersetClient,
  getExtensionsRegistry,
  isFeatureEnabled,
  FeatureFlag,
} from '@superset-ui/core';
import {
  styled,
  css,
  SupersetTheme,
  useTheme,
} from '@apache-superset/core/theme';
import {
  Tag,
  Tooltip,
  Menu,
  Icons,
  Typography,
  TelemetryPixel,
} from '@superset-ui/core/components';
import type { MenuItem } from '@superset-ui/core/components/Menu';
import { ensureAppRoot, makeUrl } from 'src/utils/pathUtils';
import { isEmbedded } from 'src/dashboard/util/isEmbedded';
import { findPermission } from 'src/utils/findPermission';
import { isUserAdmin } from 'src/dashboard/util/permissionUtils';
import {
  MenuObjectProps,
  UserWithPermissionsAndRoles,
  MenuObjectChildProps,
} from 'src/types/bootstrapTypes';
import { RootState } from 'src/dashboard/types';
import DatabaseModal from 'src/features/databases/DatabaseModal';
import UploadDataModal from 'src/features/databases/UploadDataModel';
import { uploadUserPerms } from 'src/views/CRUD/utils';
import { useThemeContext } from 'src/theme/ThemeProvider';
import { useThemeMenuItems } from 'src/hooks/useThemeMenuItems';
import { useLanguageMenuItems } from './LanguagePicker';
import {
  ExtensionConfigs,
  GlobalMenuDataOptions,
  RightMenuProps,
} from './types';
import { NAVBAR_MENU_POPUP_OFFSET } from './commonMenuData';

const extensionsRegistry = getExtensionsRegistry();

const StyledDiv = styled.div<{ align: string; $vertical?: boolean }>`
  ${({ align, $vertical, theme }) => css`
    display: flex;
    width: ${$vertical ? '100%' : 'auto'};
    height: ${$vertical ? 'auto' : '100%'};
    flex-direction: ${$vertical ? 'column' : 'row'};
    justify-content: ${$vertical ? 'flex-start' : align};
    align-items: ${$vertical ? 'stretch' : 'center'};
    gap: ${$vertical ? `${theme.sizeUnit * 2}px` : 0};
  `}
`;

const StyledMenuItemWithIcon = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const StyledAnchor = styled.a<{ $vertical?: boolean }>`
  ${({ theme, $vertical }) => css`
    padding-right: ${theme.sizeUnit}px;
    padding-left: ${theme.sizeUnit}px;

    ${$vertical &&
    css`
      width: 100%;
      display: flex;
      align-items: center;
      border-radius: ${theme.borderRadius}px;
      padding: ${theme.sizeUnit * 2}px;
      color: ${theme.colorText};

      &:hover {
        background: ${theme.colorBgTextHover};
      }
    `}
  `}
`;

const StyledMenuItem = styled.div<{ disabled?: boolean }>`
  ${({ theme, disabled }) => css`
    &&:hover {
      color: ${!disabled && theme.colorPrimary};
      cursor: ${!disabled ? 'pointer' : 'not-allowed'};
    }
    ${disabled &&
    css`
      color: ${theme.colorTextDisabled};
    `}
  `}
`;

const StyledUserMenuTrigger = styled.div`
  ${({ theme }) => css`
    display: inline-flex;
    align-items: center;
    gap: ${theme.sizeUnit * 2}px;
    min-width: 0;
  `}
`;

const StyledUserAvatar = styled.span`
  ${({ theme }) => css`
    width: ${theme.sizeUnit * 7}px;
    height: ${theme.sizeUnit * 7}px;
    border-radius: ${theme.borderRadius}px;
    background: #5f6f9f;
    color: #ffffff;
    font-size: ${theme.fontSizeSM}px;
    font-weight: ${theme.fontWeightStrong};
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    text-transform: uppercase;
  `}
`;

const StyledUserName = styled.span`
  ${({ theme }) => css`
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: ${theme.colorText};
    font-weight: ${theme.fontWeightStrong};
  `}
`;

const StyledUserDropdownHeader = styled.div`
  ${({ theme }) => css`
    display: inline-flex;
    align-items: center;
    gap: ${theme.sizeUnit * 2}px;
    font-weight: ${theme.fontWeightStrong};
    color: ${theme.colorText};
  `}
`;

const getSettingsSectionKey = (
  section: MenuObjectProps,
  sectionIndex: number,
) => {
  const sectionName =
    section.name ||
    (typeof section.label === 'string' ? section.label : `section-${sectionIndex}`);
  return `settings-section-${sectionName}-${sectionIndex}`;
};

const USER_INFO_PATH = '/user_info/';

const normalizeMenuText = (value?: string) => (value || '').toLowerCase();

const getSettingsSectionIcon = (section: MenuObjectProps) => {
  const sectionToken = `${normalizeMenuText(section.name)} ${normalizeMenuText(
    typeof section.label === 'string' ? section.label : '',
  )}`;

  if (sectionToken.includes('security') || sectionToken.includes('güvenlik')) {
    return <Icons.LockOutlined iconSize="m" />;
  }
  if (sectionToken.includes('data') || sectionToken.includes('veri')) {
    return <Icons.DatabaseOutlined iconSize="m" />;
  }
  if (sectionToken.includes('manage') || sectionToken.includes('yönetim')) {
    return <Icons.AppstoreOutlined iconSize="m" />;
  }
  return <Icons.FolderOutlined iconSize="m" />;
};

const getSettingsChildIcon = (
  section: MenuObjectProps,
  child: MenuObjectChildProps,
) => {
  const sectionToken = `${normalizeMenuText(section.name)} ${normalizeMenuText(
    typeof section.label === 'string' ? section.label : '',
  )}`;
  const childToken = `${normalizeMenuText(child.name)} ${normalizeMenuText(
    typeof child.label === 'string' ? child.label : '',
  )}`;

  if (sectionToken.includes('security') || sectionToken.includes('güvenlik')) {
    if (childToken.includes('role')) return <Icons.GroupOutlined iconSize="m" />;
    if (childToken.includes('user')) return <Icons.UserOutlined iconSize="m" />;
    if (childToken.includes('group'))
      return <Icons.UsergroupAddOutlined iconSize="m" />;
    if (childToken.includes('action') || childToken.includes('log'))
      return <Icons.HistoryOutlined iconSize="m" />;
    if (
      childToken.includes('row level') ||
      childToken.includes('rls') ||
      childToken.includes('satır')
    ) {
      return <Icons.LockOutlined iconSize="m" />;
    }
    return <Icons.KeyOutlined iconSize="m" />;
  }

  if (sectionToken.includes('data') || sectionToken.includes('veri')) {
    if (childToken.includes('database'))
      return <Icons.DatabaseOutlined iconSize="m" />;
    if (childToken.includes('dataset')) return <Icons.TableOutlined iconSize="m" />;
    return <Icons.TableOutlined iconSize="m" />;
  }

  if (sectionToken.includes('manage') || sectionToken.includes('yönetim')) {
    if (childToken.includes('css')) return <Icons.BgColorsOutlined iconSize="m" />;
    if (childToken.includes('theme')) return <Icons.BulbOutlined iconSize="m" />;
    if (
      childToken.includes('alert') ||
      childToken.includes('report') ||
      childToken.includes('uyarı') ||
      childToken.includes('rapor')
    ) {
      return <Icons.BellOutlined iconSize="m" />;
    }
    if (childToken.includes('annotation'))
      return <Icons.EditOutlined iconSize="m" />;
    return <Icons.SettingOutlined iconSize="m" />;
  }

  return <Icons.FolderOpenOutlined iconSize="m" />;
};

const RightMenu = ({
  align,
  settings,
  navbarRight,
  isFrontendRoute,
  environmentTag,
  layout = 'horizontal',
  showActionDropdown: showActionDropdownProp = true,
  showThemeMenu = true,
  showLanguageMenu = true,
  showSettingsMenu = true,
  showUserMenu = false,
  showSettingsMetaItems = true,
  showExtraLinks = true,
  setQuery,
}: RightMenuProps & {
  setQuery: ({
    databaseAdded,
    datasetAdded,
  }: {
    databaseAdded?: boolean;
    datasetAdded?: boolean;
  }) => void;
}) => {
  const theme = useTheme();
  const isVertical = layout === 'vertical';
  const user = useSelector<any, UserWithPermissionsAndRoles>(
    state => state.user,
  );
  const dashboardId = useSelector<RootState, number | undefined>(
    state => state.dashboardInfo?.id,
  );
  const userValues = user || {};
  const { roles } = userValues;
  const userDisplayName =
    [userValues?.firstName, userValues?.lastName].filter(Boolean).join(' ') ||
    userValues?.username ||
    t('User');
  const userInitial =
    (userValues?.firstName?.charAt(0) ||
      userValues?.username?.charAt(0) ||
      'U'
    ).toUpperCase();
  const {
    CSV_EXTENSIONS,
    COLUMNAR_EXTENSIONS,
    EXCEL_EXTENSIONS,
    ALLOWED_EXTENSIONS,
    HAS_GSHEETS_INSTALLED,
  } = useSelector<any, ExtensionConfigs>(state => state.common.conf);
  const [showDatabaseModal, setShowDatabaseModal] = useState<boolean>(false);
  const [showCSVUploadModal, setShowCSVUploadModal] = useState<boolean>(false);
  const [showExcelUploadModal, setShowExcelUploadModal] =
    useState<boolean>(false);
  const [showColumnarUploadModal, setShowColumnarUploadModal] =
    useState<boolean>(false);
  const [sidebarOpenKeys, setSidebarOpenKeys] = useState<string[]>([]);
  const [engine, setEngine] = useState<string>('');
  const canSql = findPermission('can_sqllab', 'Superset', roles);
  const canDashboard = findPermission('can_write', 'Dashboard', roles);
  const canChart = findPermission('can_write', 'Chart', roles);
  const canDatabase = findPermission('can_write', 'Database', roles);
  const canDataset = findPermission('can_write', 'Dataset', roles);
  const hasActionDropdownPermission = canSql || canChart || canDashboard;
  const showActionDropdown =
    !isVertical && showActionDropdownProp && hasActionDropdownPermission;
  const shouldShowThemeMenu = !isVertical && showThemeMenu;

  const { canUploadData, canUploadCSV, canUploadColumnar, canUploadExcel } =
    uploadUserPerms(
      roles,
      CSV_EXTENSIONS,
      COLUMNAR_EXTENSIONS,
      EXCEL_EXTENSIONS,
      ALLOWED_EXTENSIONS,
    );

  const [allowUploads, setAllowUploads] = useState<boolean>(false);
  const [nonExamplesDBConnected, setNonExamplesDBConnected] =
    useState<boolean>(false);
  const isAdmin = isUserAdmin(user);
  const showUploads = allowUploads || isAdmin;
  const {
    setThemeMode,
    themeMode,
    clearLocalOverrides,
    hasDevOverride,
    canSetMode,
    canDetectOSPreference,
  } = useThemeContext();
  const dropdownItems: MenuObjectProps[] = [
    {
      label: t('Data'),
      icon: <Icons.DatabaseOutlined data-test={`menu-item-${t('Data')}`} />,
      childs: [
        {
          label: t('Connect database'),
          name: GlobalMenuDataOptions.DbConnection,
          perm: canDatabase && !nonExamplesDBConnected,
        },
        {
          label: t('Create dataset'),
          name: GlobalMenuDataOptions.DatasetCreation,
          url: '/dataset/add/',
          perm: canDataset && nonExamplesDBConnected,
        },
        {
          label: t('Connect Google Sheet'),
          name: GlobalMenuDataOptions.GoogleSheets,
          perm: canDatabase && HAS_GSHEETS_INSTALLED,
        },
        {
          label: t('Upload CSV to database'),
          name: GlobalMenuDataOptions.CSVUpload,
          perm: canUploadCSV && showUploads,
          disable: isAdmin && !allowUploads,
        },
        {
          label: t('Upload Excel to database'),
          name: GlobalMenuDataOptions.ExcelUpload,
          perm: canUploadExcel && showUploads,
          disable: isAdmin && !allowUploads,
        },
        {
          label: t('Upload Columnar file to database'),
          name: GlobalMenuDataOptions.ColumnarUpload,
          perm: canUploadColumnar && showUploads,
          disable: isAdmin && !allowUploads,
        },
      ],
    },
    {
      label: t('SQL query'),
      url: makeUrl('/sqllab?new=true'),
      icon: <Icons.SearchOutlined data-test={`menu-item-${t('SQL query')}`} />,
      perm: 'can_sqllab',
      view: 'Superset',
    },
    {
      label: t('Chart'),
      url: Number.isInteger(dashboardId)
        ? `/chart/add?dashboard_id=${dashboardId}`
        : '/chart/add',
      icon: <Icons.BarChartOutlined data-test={`menu-item-${t('Chart')}`} />,
      perm: 'can_write',
      view: 'Chart',
    },
    {
      label: t('Dashboard'),
      url: '/dashboard/new',
      icon: (
        <Icons.DashboardOutlined data-test={`menu-item-${t('Dashboard')}`} />
      ),
      perm: 'can_write',
      view: 'Dashboard',
    },
  ];

  const checkAllowUploads = () => {
    const payload = {
      filters: [
        { col: 'allow_file_upload', opr: 'upload_is_enabled', value: true },
      ],
    };
    SupersetClient.get({
      endpoint: `/api/v1/database/?q=${rison.encode(payload)}`,
    }).then(({ json }: Record<string, any>) => {
      // There might be some existing Gsheets and Clickhouse DBs
      // with allow_file_upload set as True which is not possible from now on
      const allowedDatabasesWithFileUpload =
        json?.result?.filter(
          (database: any) => database?.engine_information?.supports_file_upload,
        ) || [];
      setAllowUploads(allowedDatabasesWithFileUpload?.length >= 1);
    });
  };

  const existsNonExamplesDatabases = () => {
    const payload = {
      filters: [{ col: 'database_name', opr: 'neq', value: 'examples' }],
    };
    SupersetClient.get({
      endpoint: `/api/v1/database/?q=${rison.encode(payload)}`,
    }).then(({ json }: Record<string, any>) => {
      setNonExamplesDBConnected(json.count >= 1);
    });
  };

  useEffect(() => {
    if (canUploadData) {
      checkAllowUploads();
    }
  }, [canUploadData]);

  useEffect(() => {
    if (canDatabase || canDataset) {
      existsNonExamplesDatabases();
    }
  }, [canDatabase, canDataset]);

  const handleMenuSelection = (itemChose: any) => {
    if (itemChose.key === GlobalMenuDataOptions.DbConnection) {
      setShowDatabaseModal(true);
    } else if (itemChose.key === GlobalMenuDataOptions.GoogleSheets) {
      setShowDatabaseModal(true);
      setEngine('Google Sheets');
    } else if (itemChose.key === GlobalMenuDataOptions.CSVUpload) {
      setShowCSVUploadModal(true);
    } else if (itemChose.key === GlobalMenuDataOptions.ExcelUpload) {
      setShowExcelUploadModal(true);
    } else if (itemChose.key === GlobalMenuDataOptions.ColumnarUpload) {
      setShowColumnarUploadModal(true);
    }
  };

  const handleOnHideModal = () => {
    setEngine('');
    setShowDatabaseModal(false);
  };

  const tooltipText = t(
    "Enable 'Allow file uploads to database' in any database's settings",
  );

  const buildMenuItem = (item: MenuObjectChildProps): MenuItem => ({
    key: item.name || item.label,
    label: item.disable ? (
      <StyledMenuItem disabled>
        <Tooltip placement="top" title={tooltipText}>
          {item.label}
        </Tooltip>
      </StyledMenuItem>
    ) : item.url ? (
      <Typography.Link href={ensureAppRoot(item.url)}>
        {item.label}
      </Typography.Link>
    ) : (
      item.label
    ),
    disabled: item.disable,
  });

  const onMenuOpen = (openKeys: string[]) => {
    // We should query the API only if opening Data submenus
    // because the rest don't need this information. Not using
    // "Data" directly since we might change the label later on?
    if (
      openKeys.length > 1 &&
      !isEmpty(
        openKeys?.filter((key: string) =>
          key.includes(`sub2_${dropdownItems?.[0]?.label}`),
        ),
      )
    ) {
      if (canUploadData) checkAllowUploads();
      if (canDatabase || canDataset) existsNonExamplesDatabases();
    }
    return null;
  };

  const settingsSectionKeys = useMemo(
    () =>
      (settings || []).map((section, sectionIndex) =>
        getSettingsSectionKey(section, sectionIndex),
      ),
    [settings],
  );

  const isSettingsSectionKey = (key: string) =>
    settingsSectionKeys.includes(key);

  const isSettingsRelatedKey = (key: string) =>
    key === 'settings' ||
    settingsSectionKeys.some(
      sectionKey =>
        key === sectionKey || key.startsWith(`${sectionKey}-`),
    );

  const normalizeVerticalOpenKeys = (openKeys: string[]) => {
    const previousSectionKeys = sidebarOpenKeys.filter(isSettingsSectionKey);
    const currentSectionKeys = openKeys.filter(isSettingsSectionKey);
    const newlyOpenedSectionKey = currentSectionKeys.find(
      key => !previousSectionKeys.includes(key),
    );
    const previouslyHadSettingsOpen = sidebarOpenKeys.includes('settings');
    const settingsRootExplicitlyClosed =
      previouslyHadSettingsOpen && !openKeys.includes('settings');

    const nextOpenKeys = openKeys.filter(key => !isSettingsRelatedKey(key));
    if (settingsRootExplicitlyClosed) {
      return Array.from(new Set(nextOpenKeys));
    }

    const hasSettingsOpen =
      openKeys.includes('settings') || currentSectionKeys.length > 0;
    if (hasSettingsOpen) {
      nextOpenKeys.push('settings');
    }

    if (hasSettingsOpen && currentSectionKeys.length) {
      const sectionKeyToKeep =
        newlyOpenedSectionKey ||
        currentSectionKeys[currentSectionKeys.length - 1];
      if (sectionKeyToKeep) {
        nextOpenKeys.push(sectionKeyToKeep);
      }
    }

    return Array.from(new Set(nextOpenKeys));
  };

  const handleMenuOpenChange = (openKeys: string[]) => {
    onMenuOpen(openKeys);

    if (!isVertical) {
      return;
    }

    setSidebarOpenKeys(normalizeVerticalOpenKeys(openKeys));
  };
  const RightMenuExtension = extensionsRegistry.get('navbar.right');
  const RightMenuItemIconExtension = extensionsRegistry.get(
    'navbar.right-menu.item.icon',
  );

  const handleDatabaseAdd = () => setQuery({ databaseAdded: true });

  const handleLogout = () => {
    try {
      window.localStorage.removeItem('redux');
      window.sessionStorage.removeItem('login_attempted');
    } catch (error) {
      console.warn('Failed to clear storage on logout:', error);
    }
  };

  // Use the theme menu hook
  const themeMenuItem = useThemeMenuItems({
    setThemeMode,
    themeMode,
    hasLocalOverride: hasDevOverride(),
    onClearLocalSettings: clearLocalOverrides,
    allowOSPreference: canDetectOSPreference(),
  });

  const languageMenuItem = useLanguageMenuItems({
    locale: navbarRight.locale || 'en',
    languages: navbarRight.languages || {},
  });
  const aboutInfoLines = [
    navbarRight.show_watermark && t('Powered by Apache Superset'),
    navbarRight.version_string && `${t('Version')}: ${navbarRight.version_string}`,
    navbarRight.version_sha && `${t('SHA')}: ${navbarRight.version_sha}`,
    navbarRight.build_number && `${t('Build')}: ${navbarRight.build_number}`,
  ].filter(Boolean) as string[];
  const showLogout =
    !isEmbedded() ||
    !isFeatureEnabled(FeatureFlag.DisableEmbeddedSupersetLogout);

  // Build main menu items
  const menuItems = useMemo(() => {
    // Build menu items for the new dropdown
    const buildNewDropdownItems = (): MenuItem[] => {
      const items: MenuItem[] = [];

      dropdownItems?.forEach(menu => {
        const canShowChild = menu.childs?.some(
          item => typeof item === 'object' && !!item.perm,
        );

        if (menu.childs) {
          if (canShowChild) {
            const childItems: MenuItem[] = [];
            menu.childs.forEach((item, idx) => {
              if (typeof item !== 'string' && item.name && item.perm) {
                if (idx === 3) {
                  childItems.push({ type: 'divider', key: `divider-${idx}` });
                }
                childItems.push(buildMenuItem(item));
              }
            });

            items.push({
              key: `sub2_${menu.label}`,
              label: menu.label,
              icon: menu.icon,
              children: childItems,
              popupClassName: 'header-action-dropdown-popup',
              popupOffset: NAVBAR_MENU_POPUP_OFFSET,
            });
          } else if (menu.url) {
            if (
              findPermission(menu.perm as string, menu.view as string, roles)
            ) {
              items.push({
                key: menu.label,
                label: isFrontendRoute(menu.url) ? (
                  <Link to={menu.url || ''}>{menu.label}</Link>
                ) : (
                  <Typography.Link href={ensureAppRoot(menu.url || '')}>
                    {menu.label}
                  </Typography.Link>
                ),
                icon: menu.icon,
              });
            }
          }
        } else if (
          findPermission(menu.perm as string, menu.view as string, roles)
        ) {
          items.push({
            key: menu.label,
            label: isFrontendRoute(menu.url) ? (
              <Link to={menu.url || ''}>{menu.label}</Link>
            ) : (
              <Typography.Link href={ensureAppRoot(menu.url || '')}>
                {menu.label}
              </Typography.Link>
            ),
            icon: menu.icon,
          });
        }
      });

      return items;
    };

    // Build settings menu items
    const buildSettingsMenuItems = (): MenuItem[] => {
      const items: MenuItem[] = [];

      settings?.forEach((section, sectionIndex) => {
        const sectionKey = getSettingsSectionKey(section, sectionIndex);
        const sectionItems: MenuItem[] = [];

        section.childs?.forEach((child, childIndex) => {
          if (typeof child !== 'string') {
            const menuItemDisplay = RightMenuItemIconExtension && !isVertical ? (
              <StyledMenuItemWithIcon>
                {child.label}
                <RightMenuItemIconExtension menuChild={child} />
              </StyledMenuItemWithIcon>
            ) : (
              child.label
            );

            sectionItems.push({
              key: `${sectionKey}-${child.name || child.label || childIndex}`,
              icon: getSettingsChildIcon(section, child),
              label: isFrontendRoute(child.url) ? (
                <Link to={child.url || ''}>{menuItemDisplay}</Link>
              ) : (
                <Typography.Link
                  href={child.url || ''}
                  css={css`
                    display: flex;
                    align-items: center;
                    line-height: ${theme.sizeUnit * 10}px;
                  `}
                >
                  {menuItemDisplay}
                </Typography.Link>
              ),
            });
          }
        });

        if (sectionItems.length) {
          const sectionMenuItem: MenuItem = {
            key: sectionKey,
            label: section.label,
            icon: getSettingsSectionIcon(section),
            children: sectionItems,
          };

          if (!isVertical) {
            sectionMenuItem.popupClassName = 'settings-sidebar-submenu-popup';
            sectionMenuItem.popupOffset = NAVBAR_MENU_POPUP_OFFSET;
          }

          items.push(sectionMenuItem);
        }
      });

      if (showSettingsMetaItems) {
        if (!navbarRight.user_is_anonymous) {
          const userItems: MenuItem[] = [];
          userItems.push({
            key: 'info',
            label: (
              <Typography.Link href={ensureAppRoot(USER_INFO_PATH)}>
                {t('Info')}
              </Typography.Link>
            ),
          });
          if (showLogout) {
            userItems.push({
              key: 'logout',
              label: (
                <Typography.Link
                  href={ensureAppRoot(navbarRight.user_logout_url)}
                >
                  {t('Logout')}
                </Typography.Link>
              ),
              onClick: handleLogout,
            });
          }

          if (userItems.length) {
            items.push({
              key: 'settings-user-section',
              label: t('User'),
              children: userItems,
              popupClassName: 'settings-sidebar-submenu-popup',
              popupOffset: NAVBAR_MENU_POPUP_OFFSET,
            });
          }
        }

        if (aboutInfoLines.length) {
          items.push({
            key: 'about-info',
            label: (
              <Tooltip
                placement="right"
                title={
                  <div
                    css={(theme: SupersetTheme) => css`
                      font-size: ${theme.fontSizeSM}px;
                      color: #ffffff;
                      white-space: pre-wrap;
                      padding: ${theme.sizeUnit}px ${theme.sizeUnit * 2}px;
                    `}
                  >
                    {aboutInfoLines.join('\n')}
                  </div>
                }
              >
                <div
                  css={css`
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                  `}
                >
                  <Icons.InfoCircleOutlined iconSize="m" />
                  <span>{t('About')}</span>
                </div>
              </Tooltip>
            ),
          });
        }
      }
      return items;
    };

    const items: MenuItem[] = [];

    if (RightMenuExtension) {
      items.push({
        key: 'extension',
        label: <RightMenuExtension />,
      });
    }

    if (!navbarRight.user_is_anonymous && showActionDropdown) {
      items.push({
        key: 'new-dropdown',
        label: <Icons.PlusOutlined data-test="new-dropdown-icon" />,
        className: 'submenu-with-caret',
        icon: <Icons.DownOutlined iconSize="xs" />,
        children: buildNewDropdownItems(),
        popupClassName: 'header-action-dropdown-popup',
        popupOffset: NAVBAR_MENU_POPUP_OFFSET,
      });
    }

    if (shouldShowThemeMenu && canSetMode()) {
      items.push(themeMenuItem);
    }

    if (showLanguageMenu && navbarRight.show_language_picker && languageMenuItem) {
      items.push(languageMenuItem);
    }

    if (showUserMenu && !isVertical && !navbarRight.user_is_anonymous) {
      const userMenuChildren: MenuItem[] = [
        {
          key: 'user-profile-header',
          disabled: true,
          label: (
            <StyledUserDropdownHeader>
              <Icons.UserOutlined iconSize="m" />
              <span>{userDisplayName}</span>
            </StyledUserDropdownHeader>
          ),
        },
        {
          type: 'divider',
          key: 'user-profile-divider-1',
        },
        {
          key: 'user-dashboard-list',
          icon: <Icons.DashboardOutlined iconSize="m" />,
          label: isFrontendRoute('/dashboard/list/') ? (
            <Link to="/dashboard/list/">{t('Dashboard')}</Link>
          ) : (
            <Typography.Link href={ensureAppRoot('/dashboard/list/')}>
              {t('Dashboard')}
            </Typography.Link>
          ),
        },
      ];

      if (aboutInfoLines.length) {
        userMenuChildren.push({
          key: 'user-about-info',
          icon: <Icons.InfoCircleOutlined iconSize="m" />,
          label: (
            <Tooltip
              placement="left"
              title={
                <div
                  css={(theme: SupersetTheme) => css`
                    font-size: ${theme.fontSizeSM}px;
                    color: #ffffff;
                    white-space: pre-wrap;
                    padding: ${theme.sizeUnit}px ${theme.sizeUnit * 2}px;
                  `}
                >
                  {aboutInfoLines.join('\n')}
                </div>
              }
            >
              <span>{t('About')}</span>
            </Tooltip>
          ),
        });
      }

      if (showLogout) {
        userMenuChildren.push({
          key: 'user-logout',
          icon: <Icons.LoginOutlined iconSize="m" />,
          label: (
            <Typography.Link href={ensureAppRoot(navbarRight.user_logout_url)}>
              {t('Logout')}
            </Typography.Link>
          ),
          onClick: handleLogout,
        });
      }

      items.push({
        key: 'user-profile-menu',
        label: (
          <StyledUserMenuTrigger>
            <StyledUserAvatar>{userInitial}</StyledUserAvatar>
            <StyledUserName>{userDisplayName}</StyledUserName>
          </StyledUserMenuTrigger>
        ),
        className: 'submenu-with-caret user-menu-trigger',
        icon: <Icons.DownOutlined iconSize="xs" />,
        children: userMenuChildren,
        popupClassName: 'header-user-dropdown-popup',
        popupOffset: NAVBAR_MENU_POPUP_OFFSET,
        onTitleClick: () => {
          const userInfoUrl = navbarRight.user_info_url || '/users/userinfo/';
          window.location.assign(ensureAppRoot(userInfoUrl));
        },
      });
    }

    if (showSettingsMenu) {
      const settingsMenuItem: MenuItem = {
        key: 'settings',
        label: t('Settings'),
        icon: isVertical ? (
          <Icons.SettingOutlined iconSize="m" />
        ) : (
          <Icons.DownOutlined iconSize="xs" />
        ),
        children: buildSettingsMenuItems(),
        className: isVertical
          ? 'submenu-with-caret settings-sidebar-item'
          : 'submenu-with-caret',
      };

      if (!isVertical) {
        settingsMenuItem.popupOffset = NAVBAR_MENU_POPUP_OFFSET;
      }

      items.push(settingsMenuItem);
    }

    return items;
  }, [
    RightMenuExtension,
    navbarRight,
    showActionDropdown,
    shouldShowThemeMenu,
    showLanguageMenu,
    showSettingsMenu,
    showUserMenu,
    showSettingsMetaItems,
    canSetMode,
    isVertical,
    theme.colorPrimary,
    themeMenuItem,
    languageMenuItem,
    dropdownItems,
    roles,
    settings,
    userDisplayName,
    userInitial,
    aboutInfoLines,
    showLogout,
    RightMenuItemIconExtension,
    buildMenuItem,
    handleLogout,
  ]);

  return (
    <StyledDiv align={align} $vertical={isVertical}>
      {!isVertical && (
        <Global
          styles={css`
            .header-action-dropdown-popup.ant-menu-submenu-popup {
              z-index: 1205 !important;
            }

            .header-action-dropdown-popup .ant-menu {
              z-index: 1205 !important;
            }

            .header-user-dropdown-popup.ant-menu-submenu-popup {
              z-index: 1205 !important;
            }

            .header-user-dropdown-popup .ant-menu {
              min-width: 240px;
              z-index: 1205 !important;
            }

            .header-user-dropdown-popup .ant-menu-item-disabled {
              opacity: 1 !important;
              cursor: default !important;
            }
          `}
        />
      )}
      {canDatabase && (
        <DatabaseModal
          onHide={handleOnHideModal}
          show={showDatabaseModal}
          dbEngine={engine}
          onDatabaseAdd={handleDatabaseAdd}
        />
      )}
      {canUploadCSV && (
        <UploadDataModal
          onHide={() => setShowCSVUploadModal(false)}
          show={showCSVUploadModal}
          allowedExtensions={CSV_EXTENSIONS}
          type="csv"
        />
      )}
      {canUploadExcel && (
        <UploadDataModal
          onHide={() => setShowExcelUploadModal(false)}
          show={showExcelUploadModal}
          allowedExtensions={EXCEL_EXTENSIONS}
          type="excel"
        />
      )}
      {canUploadColumnar && (
        <UploadDataModal
          onHide={() => setShowColumnarUploadModal(false)}
          show={showColumnarUploadModal}
          allowedExtensions={COLUMNAR_EXTENSIONS}
          type="columnar"
        />
      )}
      {environmentTag?.text &&
        (() => {
          // Map color values to Ant Design semantic colors
          const validAntDesignColors = [
            'error',
            'warning',
            'success',
            'processing',
            'default',
          ];

          const tagColor = validAntDesignColors.includes(environmentTag.color)
            ? environmentTag.color
            : 'default';

          return (
            <Tag
              color={tagColor}
              css={css`
                border-radius: ${theme.sizeUnit * 125}px;
              `}
            >
              {environmentTag.text}
            </Tag>
          );
        })()}
      <Menu
        css={css`
          &.ant-menu,
          &.ant-menu-inline,
          &.ant-menu-vertical {
            background: transparent !important;
            border-inline-end: none !important;
          }

          display: flex;
          flex-direction: ${isVertical ? 'column' : 'row'};
          align-items: center;
          height: ${isVertical ? 'auto' : '100%'};
          width: ${isVertical ? '100%' : 'auto'};
          border-bottom: none !important;

          /* Remove the underline from menu items */
          .ant-menu-item:after,
          .ant-menu-submenu:after {
            content: none !important;
          }

          ${isVertical &&
          css`
            &.ant-menu-vertical,
            &.ant-menu-inline {
              display: block !important;
              width: 100%;
              background: transparent !important;
              border-inline-end: none !important;
            }

            .ant-menu-vertical .ant-menu-item .ant-menu-item-icon,
            .ant-menu-vertical .ant-menu-submenu-title .ant-menu-item-icon,
            .ant-menu-inline .ant-menu-item .ant-menu-item-icon,
            .ant-menu-inline .ant-menu-submenu-title .ant-menu-item-icon {
              color: #e8ebf4 !important;
              font-size: ${theme.fontSizeLG}px;
              margin-inline-end: ${theme.sizeUnit * 2}px;
            }

            .ant-menu-vertical
                .ant-menu-item
                .ant-menu-item-icon
                + .ant-menu-title-content,
            .ant-menu-vertical
                .ant-menu-submenu-title
                .ant-menu-item-icon
                + .ant-menu-title-content,
            .ant-menu-inline
                .ant-menu-item
                .ant-menu-item-icon
                + .ant-menu-title-content,
            .ant-menu-inline
                .ant-menu-submenu-title
                .ant-menu-item-icon
                + .ant-menu-title-content {
              margin-inline-start: ${theme.sizeUnit * 2}px !important;
            }

            .ant-menu-vertical > .ant-menu-item,
            .ant-menu-vertical > .ant-menu-submenu,
            .ant-menu-inline > .ant-menu-item {
              width: 100%;
              margin: ${theme.sizeUnit}px 0 !important;
              border-radius: ${theme.borderRadius}px;
              min-height: ${theme.sizeUnit * 11}px;
              line-height: ${theme.sizeUnit * 11}px;
              padding: 0 ${theme.sizeUnit * 2}px !important;
            }

            .ant-menu-inline > .ant-menu-submenu {
              width: 100%;
              margin: ${theme.sizeUnit}px 0 !important;
              border-radius: ${theme.borderRadius}px;
              min-height: auto !important;
              line-height: normal !important;
              padding: 0 !important;
              overflow: visible;
            }

            .ant-menu-inline > .ant-menu-submenu > .ant-menu-submenu-title {
              min-height: ${theme.sizeUnit * 11}px;
              line-height: ${theme.sizeUnit * 11}px;
              padding: 0 ${theme.sizeUnit * 2}px !important;
              display: flex;
              align-items: center;
            }

            .ant-menu-submenu-title {
              display: flex;
              align-items: center;
              justify-content: space-between;
              width: 100%;
            }

            .ant-menu-inline .ant-menu-title-content {
              min-width: 0;
              flex: 1;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .ant-menu-inline .ant-menu-sub.ant-menu-inline {
              background: transparent !important;
            }

            .ant-menu-inline .ant-menu-sub.ant-menu-inline .ant-menu-item,
            .ant-menu-inline
              .ant-menu-sub.ant-menu-inline
              .ant-menu-submenu-title {
              margin: ${theme.sizeUnit}px 0 !important;
              border-radius: ${theme.borderRadius}px;
              min-height: ${theme.sizeUnit * 10}px;
              line-height: ${theme.sizeUnit * 10}px;
            }

            .ant-menu-inline .ant-menu-sub.ant-menu-inline .ant-menu-item,
            .ant-menu-inline
              .ant-menu-sub.ant-menu-inline
              .ant-menu-submenu
              .ant-menu-submenu-title {
              padding-inline-start: ${theme.sizeUnit * 7}px !important;
            }

            .settings-sidebar-item .ant-menu-sub.ant-menu-inline .ant-menu-item,
            .settings-sidebar-item
              .ant-menu-sub.ant-menu-inline
              .ant-menu-submenu-title {
              padding-inline-start: ${theme.sizeUnit * 2}px !important;
            }

            .ant-menu-inline .ant-menu-submenu-arrow::before,
            .ant-menu-inline .ant-menu-submenu-arrow::after {
              background: #e8ebf4 !important;
            }

            .ant-menu-inline .ant-menu-submenu-open > .ant-menu-submenu-title
              .ant-menu-submenu-arrow::before,
            .ant-menu-inline .ant-menu-submenu-open > .ant-menu-submenu-title
              .ant-menu-submenu-arrow::after {
              background: #cba774 !important;
            }

            .settings-sidebar-item .ant-menu-title-content {
              color: #e8ebf4 !important;
            }

            .settings-sidebar-item.ant-menu-submenu:hover
              > .ant-menu-submenu-title
              .ant-menu-title-content,
            .settings-sidebar-item.ant-menu-submenu-active
              > .ant-menu-submenu-title
              .ant-menu-title-content {
              color: #cba774 !important;
            }
          `}

          .submenu-with-caret {
            height: ${isVertical ? 'auto' : '100%'};
            > .ant-menu-submenu-title {
              align-items: center;
              display: flex;
              gap: ${isVertical ? 0 : theme.sizeUnit * 2}px;
              flex-direction: ${isVertical ? 'row' : 'row-reverse'};
              height: ${isVertical ? 'auto' : '100%'};
            }
            &.ant-menu-submenu::after {
              inset-inline: ${theme.sizeUnit}px;
            }
            &.ant-menu-submenu:hover > .ant-menu-submenu-title,
            &.ant-menu-submenu-active > .ant-menu-submenu-title {
              .ant-menu-title-content {
                color: ${theme.colorPrimary};
              }
            }

            &.settings-sidebar-item.ant-menu-submenu:hover
              > .ant-menu-submenu-title,
            &.settings-sidebar-item.ant-menu-submenu-active
              > .ant-menu-submenu-title {
              .ant-menu-title-content {
                color: #cba774 !important;
              }
            }

            &.user-menu-trigger .ant-menu-submenu-title {
              flex-direction: row !important;
            }
          }
        `}
        selectable={false}
        mode={isVertical ? 'inline' : 'horizontal'}
        triggerSubMenuAction={isVertical ? 'click' : 'hover'}
        onClick={handleMenuSelection}
        onOpenChange={handleMenuOpenChange}
        openKeys={isVertical ? sidebarOpenKeys : undefined}
        disabledOverflow
        items={menuItems}
      />
      {showExtraLinks && navbarRight.documentation_url && (
        <>
          <StyledAnchor
            href={navbarRight.documentation_url}
            target="_blank"
            rel="noreferrer"
            title={navbarRight.documentation_text || t('Documentation')}
            $vertical={isVertical}
          >
            {navbarRight.documentation_icon ? (
              <Icons.BookOutlined />
            ) : (
              <Icons.QuestionCircleOutlined />
            )}
          </StyledAnchor>
          {!isVertical && <span>&nbsp;</span>}
        </>
      )}
      {showExtraLinks && navbarRight.bug_report_url && (
        <>
          <StyledAnchor
            href={navbarRight.bug_report_url}
            target="_blank"
            rel="noreferrer"
            title={navbarRight.bug_report_text || t('Report a bug')}
            $vertical={isVertical}
          >
            {navbarRight.bug_report_icon ? (
              <i className={navbarRight.bug_report_icon} />
            ) : (
              <Icons.BugOutlined />
            )}
          </StyledAnchor>
          {!isVertical && <span>&nbsp;</span>}
        </>
      )}
      {showExtraLinks && navbarRight.user_is_anonymous && (
        <StyledAnchor href={navbarRight.user_login_url} $vertical={isVertical}>
          <Icons.LoginOutlined /> {t('Login')}
        </StyledAnchor>
      )}
      <TelemetryPixel
        version={navbarRight.version_string}
        sha={navbarRight.version_sha}
        build={navbarRight.build_number}
      />
    </StyledDiv>
  );
};

const RightMenuWithQueryWrapper: FC<RightMenuProps> = props => {
  const [, setQuery] = useQueryParams({
    databaseAdded: BooleanParam,
    datasetAdded: BooleanParam,
  });

  return <RightMenu setQuery={setQuery} {...props} />;
};

// Query param manipulation requires that, during the setup, the
// QueryParamProvider is present and configured.
// Superset still has multiple entry points, and not all of them have
// the same setup, and critically, not all of them have the QueryParamProvider.
// This wrapper ensures the RightMenu renders regardless of the provider being present.
class RightMenuErrorWrapper extends PureComponent<RightMenuProps> {
  state = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  noop = () => {};

  render() {
    if (this.state.hasError) {
      return <RightMenu setQuery={this.noop} {...this.props} />;
    }

    return this.props.children;
  }
}

const RightMenuWrapper: FC<RightMenuProps> = props => (
  <RightMenuErrorWrapper {...props}>
    <RightMenuWithQueryWrapper {...props} />
  </RightMenuErrorWrapper>
);

export default RightMenuWrapper;
