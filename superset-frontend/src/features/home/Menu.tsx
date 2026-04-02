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
import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { t } from '@apache-superset/core/translation';
import {
  styled,
  css,
  useTheme,
  isThemeDark,
  ThemeMode,
} from '@apache-superset/core/theme';
import { ensureStaticPrefix } from 'src/utils/assetUrl';
import { ensureAppRoot } from 'src/utils/pathUtils';
import { getUrlParam } from 'src/utils/urlUtils';
import { MainNav, MenuItem } from '@superset-ui/core/components/Menu';
import { Tooltip, Grid, Row, Col, Image } from '@superset-ui/core/components';
import { GenericLink } from 'src/components';
import { NavLink, useLocation } from 'react-router-dom';
import { Icons } from '@superset-ui/core/components/Icons';
import { Typography } from '@superset-ui/core/components/Typography';
import { useUiConfig } from 'src/components/UiConfigContext';
import { URL_PARAMS } from 'src/constants';
import { useThemeContext } from 'src/theme/ThemeProvider';
import {
  MenuObjectChildProps,
  MenuObjectProps,
  MenuData,
} from 'src/types/bootstrapTypes';
import RightMenu from './RightMenu';

interface MenuProps {
  data: MenuData;
  isFrontendRoute?: (path?: string) => boolean;
}

const SIDEBAR_WIDTH = 224;
const HEADER_HEIGHT = 64;
const HEADER_HEIGHT_VAR = `var(--superset-home-header-height, ${HEADER_HEIGHT}px)`;

const StyledHeader = styled.header`
  ${({ theme }) => css`
    background-color: ${theme.colorBgContainer};
    border-bottom: 1px solid ${theme.colorBorderSecondary};
    padding: 0 ${theme.sizeUnit * 4}px;
    z-index: 1100;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    box-sizing: border-box;
    height: ${HEADER_HEIGHT}px;
    display: flex;
    align-items: center;

    &:nth-last-of-type(2) nav {
      margin-bottom: 2px;
    }

    .caret {
      display: none;
    }

    @media (max-width: ${theme.screenSM}px) {
      padding: 0 ${theme.sizeUnit * 2}px;
    }
  `}
`;

const StyledSidebarBackdrop = styled.button<{ $open: boolean }>`
  ${({ $open, theme }) => css`
    position: fixed;
    top: ${HEADER_HEIGHT_VAR};
    left: 0;
    right: 0;
    bottom: 0;
    border: 0;
    margin: 0;
    padding: 0;
    width: 100%;
    height: calc(100% - ${HEADER_HEIGHT_VAR});
    background: rgba(5, 10, 28, 0.48);
    z-index: 999;
    opacity: ${$open ? 1 : 0};
    pointer-events: ${$open ? 'auto' : 'none'};
    transition: opacity 0.25s ease;

    @media (min-width: ${theme.screenLG}px) {
      display: none;
    }
  `}
`;

const StyledSidebarPanel = styled.aside<{ $open: boolean }>`
  ${({ $open, theme }) => css`
    position: fixed;
    top: ${HEADER_HEIGHT_VAR};
    left: 0;
    height: calc(100dvh - ${HEADER_HEIGHT_VAR});
    width: ${SIDEBAR_WIDTH}px;
    z-index: 1000;
    background: linear-gradient(180deg, #1f2640 0%, #171d34 100%);
    border-right: 1px solid rgba(203, 167, 116, 0.22);
    transform: translateX(${$open ? '0' : `-${SIDEBAR_WIDTH}px`});
    transition: transform 0.25s ease;
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
    overflow-y: auto;

    @media (max-width: ${theme.screenLG}px) {
      width: min(86vw, ${SIDEBAR_WIDTH}px);
      transform: translateX(${$open ? '0' : '-100%'});
    }

    @media (max-width: ${theme.screenSM}px) {
      width: 100vw;
    }
  `}
`;

const StyledBrandText = styled.div`
  ${({ theme }) => css`
    border-left: 1px solid ${theme.colorBorderSecondary};
    border-right: 1px solid ${theme.colorBorderSecondary};
    height: 100%;
    color: ${theme.colorText};
    padding-left: ${theme.sizeUnit * 4}px;
    padding-right: ${theme.sizeUnit * 4}px;
    font-size: ${theme.fontSizeLG}px;
    float: left;
    display: flex;
    flex-direction: column;
    justify-content: center;

    span {
      max-width: ${theme.sizeUnit * 58}px;
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    @media (max-width: 1127px) {
      display: none;
    }
  `}
`;

const StyledSidebarToggle = styled.button<{ $dark: boolean }>`
  ${({ theme, $dark }) => css`
    width: ${theme.sizeUnit * 10}px;
    height: ${theme.sizeUnit * 10}px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: ${$dark ? '#ffffff' : '#000000'};
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background ${theme.motionDurationMid};

    &:hover {
      background: rgba(255, 255, 255, 0.16);
    }

    &:focus-visible {
      outline: 2px solid rgba(203, 167, 116, 0.65);
      outline-offset: 2px;
    }
  `}
`;

const StyledSidebarNav = styled(MainNav)`
  ${({ theme }) => css`
    border-inline-end: none;
    background: transparent;
    color: #f6f8ff;
    padding: ${theme.sizeUnit * 2}px;
    overflow: visible;

    &.ant-menu {
      background: transparent;
    }

    .ant-menu-submenu-title,
    .ant-menu-item {
      min-height: ${theme.sizeUnit * 11}px;
      border-radius: ${theme.borderRadius}px;
      margin: ${theme.sizeUnit}px 0;
      color: #e8ebf4;
      display: flex;
      align-items: center;
    }

    .ant-menu-item .ant-menu-item-icon,
    .ant-menu-submenu-title .ant-menu-item-icon {
      color: inherit;
      font-size: ${theme.fontSizeLG}px;
    }

    .ant-menu-item .ant-menu-item-icon + span,
    .ant-menu-submenu-title .ant-menu-item-icon + span {
      margin-inline-start: ${theme.sizeUnit * 2}px;
    }

    .ant-menu-submenu-title:hover,
    .ant-menu-item:hover,
    .ant-menu-submenu-selected > .ant-menu-submenu-title,
    .ant-menu-item-selected {
      color: #cba774 !important;
      background: rgba(255, 255, 255, 0.1) !important;
    }

    .ant-menu-submenu-arrow::before,
    .ant-menu-submenu-arrow::after {
      background: #e8ebf4 !important;
    }

    .ant-menu-submenu-selected .ant-menu-submenu-arrow::before,
    .ant-menu-submenu-selected .ant-menu-submenu-arrow::after {
      background: #cba774 !important;
    }

    a {
      color: inherit;
    }
  `}
`;

const StyledSidebarUtilityMenu = styled.div`
  ${({ theme }) => css`
    padding: 0 ${theme.sizeUnit * 2}px ${theme.sizeUnit * 2}px;

    > .ant-menu-horizontal,
    > .ant-menu-vertical,
    > .ant-menu-inline {
      display: block !important;
      border-bottom: none !important;
      border-inline-end: none !important;
      background: transparent !important;
    }

    .ant-menu-horizontal > .ant-menu-item,
    .ant-menu-horizontal > .ant-menu-submenu,
    .ant-menu-vertical > .ant-menu-item,
    .ant-menu-vertical > .ant-menu-submenu,
    .ant-menu-inline > .ant-menu-item {
      margin: ${theme.sizeUnit}px 0 !important;
      padding: 0 ${theme.sizeUnit * 2}px !important;
      height: ${theme.sizeUnit * 11}px !important;
      line-height: ${theme.sizeUnit * 11}px !important;
      border-radius: ${theme.borderRadius}px;
      color: #e8ebf4 !important;
      width: 100%;
    }

    .ant-menu-inline > .ant-menu-submenu {
      margin: ${theme.sizeUnit}px 0 !important;
      border-radius: ${theme.borderRadius}px;
      color: #e8ebf4 !important;
      width: 100%;
      height: auto !important;
      line-height: normal !important;
      padding: 0 !important;
      overflow: visible;
    }

    .ant-menu-inline > .ant-menu-submenu > .ant-menu-submenu-title {
      padding: 0 ${theme.sizeUnit * 2}px !important;
      min-height: ${theme.sizeUnit * 11}px !important;
      line-height: ${theme.sizeUnit * 11}px !important;
      display: flex;
      align-items: center;
    }

    .ant-menu-horizontal > .ant-menu-item:hover,
    .ant-menu-horizontal > .ant-menu-submenu:hover,
    .ant-menu-horizontal > .ant-menu-submenu-open,
    .ant-menu-vertical > .ant-menu-item:hover,
    .ant-menu-vertical > .ant-menu-submenu:hover,
    .ant-menu-vertical > .ant-menu-submenu-open,
    .ant-menu-inline > .ant-menu-item:hover,
    .ant-menu-inline > .ant-menu-submenu:hover > .ant-menu-submenu-title,
    .ant-menu-inline > .ant-menu-submenu-open > .ant-menu-submenu-title {
      background: rgba(255, 255, 255, 0.1) !important;
      color: #cba774 !important;
    }

    .ant-menu-horizontal .ant-menu-title-content,
    .ant-menu-horizontal .anticon,
    .ant-menu-vertical .ant-menu-title-content,
    .ant-menu-vertical .anticon,
    .ant-menu-inline .ant-menu-title-content,
    .ant-menu-inline .anticon {
      color: #e8ebf4 !important;
    }

    .ant-menu-inline .ant-menu-sub.ant-menu-inline {
      background: transparent !important;
    }

    a {
      color: inherit !important;
    }
  `}
`;

const StyledBrandWrapper = styled.div<{ margin?: string }>`
  ${({ margin }) => css`
    height: ${margin ? 'auto' : '100%'};
    margin: ${margin ?? 0};
  `}
`;

const StyledBrandLink = styled(Typography.Link)`
  ${({ theme }) => css`
    align-items: center;
    display: flex;
    height: 100%;
    justify-content: center;

    &:focus {
      border-color: transparent;
    }

    &:focus-visible {
      border-color: ${theme.colorPrimaryText};
    }
  `}
`;

const StyledRow = styled(Row)`
  height: 100%;
  width: 100%;
`;

const StyledCol = styled(Col)`
  ${({ theme }) => css`
    && {
      display: flex;
      align-items: center;
      width: 100%;
      min-width: 0;
      flex: 1 1 auto;
    }

    @media (max-width: ${theme.screenSM}px) {
      width: 100%;
    }
  `}
`;

const StyledHeaderLeft = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    gap: ${theme.sizeUnit * 4}px;
    min-width: 0;
    flex: 1 1 auto;

    @media (max-width: ${theme.screenSM}px) {
      gap: ${theme.sizeUnit * 2}px;
    }
  `}
`;

const StyledHeaderActions = styled.div`
  ${({ theme }) => css`
    margin-left: auto;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex: 0 0 auto;
    min-width: 0;
    min-height: ${HEADER_HEIGHT}px;
    gap: ${theme.sizeUnit * 2}px;

    @media (max-width: ${theme.screenSM}px) {
      gap: ${theme.sizeUnit}px;
    }
  `}
`;

const StyledPortalButton = styled(NavLink)`
  ${({ theme }) => css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: ${theme.sizeUnit * 8}px;
    height: ${theme.sizeUnit * 8}px;
    border-radius: ${theme.borderRadius}px;
    color: #5f6f9f;
    background: transparent;

    &:hover {
      color: ${theme.colorPrimary};
      background: ${theme.colorBgTextHover};
    }
  `}
`;

const StyledImage = styled(Image)`
  object-fit: contain;
`;

const { useBreakpoint } = Grid;

export function Menu({
  data: {
    menu,
    brand,
    navbar_right: navbarRight,
    settings,
    environment_tag: environmentTag,
  },
  isFrontendRoute = () => false,
}: MenuProps) {
  const screens = useBreakpoint();
  const uiConfig = useUiConfig();
  const theme = useTheme();
  const isDarkMode = isThemeDark(theme);
  const { themeMode, setThemeMode } = useThemeContext();
  const location = useLocation();
  const isAnonymousUser = !!navbarRight.user_is_anonymous;
  const isLoginRoute = /^\/login\/?$/.test(location.pathname);
  const shouldHideSidebar = isAnonymousUser && isLoginRoute;

  enum Paths {
    Explore = '/explore',
    Dashboard = '/dashboard',
    Chart = '/chart',
    Datasets = '/tablemodelview',
    SqlLab = '/sqllab',
    SavedQueries = '/savedqueryview',
  }

  const defaultTabSelection: string[] = [];
  const [activeTabs, setActiveTabs] = useState(defaultTabSelection);
  const [isSidebarOpen, setSidebarOpen] = useState<boolean>(
    () => !shouldHideSidebar,
  );
  useEffect(() => {
    const path = location.pathname;
    switch (true) {
      case path.startsWith(Paths.Dashboard):
        setActiveTabs(['Dashboards']);
        break;
      case path.startsWith(Paths.Chart) || path.startsWith(Paths.Explore):
        setActiveTabs(['Charts']);
        break;
      case path.startsWith(Paths.Datasets):
        setActiveTabs(['Datasets']);
        break;
      case path.startsWith(Paths.SqlLab) || path.startsWith(Paths.SavedQueries):
        setActiveTabs(['SQL']);
        break;
      default:
        setActiveTabs(defaultTabSelection);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (shouldHideSidebar) {
      setSidebarOpen(false);
      return;
    }

    if (!isSidebarOpen) {
      return;
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [isSidebarOpen, shouldHideSidebar]);

  useEffect(() => {
    if (shouldHideSidebar) {
      setSidebarOpen(false);
      return;
    }
  }, [shouldHideSidebar]);

  useEffect(() => {
    if (themeMode !== ThemeMode.DEFAULT) {
      setThemeMode(ThemeMode.DEFAULT);
    }
  }, [themeMode, setThemeMode]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--superset-home-header-height', `${HEADER_HEIGHT}px`);
    return () => {
      root.style.removeProperty('--superset-home-header-height');
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const offset =
      isSidebarOpen && screens.lg && !shouldHideSidebar
        ? `${SIDEBAR_WIDTH}px`
        : '0px';
    root.style.setProperty('--superset-home-sidebar-offset', offset);
    return () => {
      root.style.removeProperty('--superset-home-sidebar-offset');
    };
  }, [isSidebarOpen, screens.lg, shouldHideSidebar]);

  const standalone = getUrlParam(URL_PARAMS.standalone);
  if (standalone || uiConfig.hideNav) return <></>;

  const buildMenuItem = ({
    label,
    childs,
    url,
    isFrontendRoute,
    icon,
  }: MenuObjectProps & { icon?: ReactNode }): MenuItem => {
    if (url && isFrontendRoute) {
      return {
        key: label,
        icon,
        label: (
          <NavLink role="button" to={url} activeClassName="is-active">
            {label}
          </NavLink>
        ),
      };
    }

    if (url) {
      return {
        key: label,
        icon,
        label: <Typography.Link href={url}>{label}</Typography.Link>,
      };
    }

    const childItems: MenuItem[] = [];
    childs?.forEach((child: MenuObjectChildProps | string, index1: number) => {
      if (typeof child === 'string' && child === '-' && label !== 'Data') {
        childItems.push({ type: 'divider', key: `divider-${index1}` });
      } else if (typeof child !== 'string') {
        childItems.push({
          key: `${child.label}`,
          label: child.isFrontendRoute ? (
            <NavLink to={child.url || ''} exact activeClassName="is-active">
              {child.label}
            </NavLink>
          ) : (
            <Typography.Link href={child.url}>{child.label}</Typography.Link>
          ),
        });
      }
    });

    return {
      key: label,
      icon,
      label,
      children: childItems,
    };
  };

  const getSidebarIcon = (item: MenuObjectProps): ReactNode => {
    const rawName = `${item.name || ''} ${item.label || ''}`.toLowerCase();

    if (
      rawName.includes('dashboard') ||
      rawName.includes('gösterim panel')
    ) {
      return <Icons.DashboardOutlined iconSize="m" />;
    }
    if (rawName.includes('chart') || rawName.includes('grafik')) {
      return <Icons.BarChartOutlined iconSize="m" />;
    }
    if (
      rawName.includes('dataset') ||
      rawName.includes('veriset') ||
      rawName.includes('data')
    ) {
      return <Icons.DatabaseOutlined iconSize="m" />;
    }
    if (rawName.includes('sql')) {
      return <Icons.ConsoleSqlOutlined iconSize="m" />;
    }
    if (rawName.includes('home') || rawName.includes('anasayfa')) {
      return <Icons.AppstoreOutlined iconSize="m" />;
    }
    return <Icons.AppstoreOutlined iconSize="m" />;
  };

  const sidebarMenuItems = useMemo(
    () =>
      menu.map(item => {
        const props = {
          ...item,
          icon: getSidebarIcon(item),
          isFrontendRoute: isFrontendRoute(item.url),
          childs: item.childs?.map(c => {
            if (typeof c === 'string') {
              return c;
            }

            return {
              ...c,
              isFrontendRoute: isFrontendRoute(c.url),
            };
          }),
        };

        return buildMenuItem(props);
      }),
    [menu, isFrontendRoute],
  );

  const renderBrand = () => {
    let link;
    if (theme.brandLogoUrl) {
      link = (
        <StyledBrandWrapper margin={theme.brandLogoMargin}>
          <StyledBrandLink href={ensureAppRoot(theme.brandLogoHref)}>
            <StyledImage
              preview={false}
              src={ensureStaticPrefix(theme.brandLogoUrl)}
              alt={theme.brandLogoAlt || 'Apache Superset'}
              height={theme.brandLogoHeight}
            />
          </StyledBrandLink>
        </StyledBrandWrapper>
      );
    } else if (isFrontendRoute(window.location.pathname)) {
      // ---------------------------------------------------------------------------------
      // TODO: deprecate this once Theme is fully rolled out
      // Kept as is for backwards compatibility with the old theme system / superset_config.py
      link = (
        <GenericLink className="navbar-brand" to={brand.path}>
          <StyledImage
            preview={false}
            src={ensureStaticPrefix(brand.icon)}
            alt={brand.alt}
          />
        </GenericLink>
      );
    } else {
      link = (
        <Typography.Link
          className="navbar-brand"
          href={ensureAppRoot(brand.path)}
          tabIndex={-1}
        >
          <StyledImage
            preview={false}
            src={ensureStaticPrefix(brand.icon)}
            alt={brand.alt}
          />
        </Typography.Link>
      );
    }
    // ---------------------------------------------------------------------------------
    return <>{link}</>;
  };
  return (
    <>
      {!shouldHideSidebar && (
        <>
          <StyledSidebarBackdrop
            type="button"
            $open={isSidebarOpen}
            aria-label={t('Close menu')}
            onClick={() => setSidebarOpen(false)}
          />
          <StyledSidebarPanel $open={isSidebarOpen}>
            <StyledSidebarNav
              mode="inline"
              data-test="navbar-top"
              className="main-nav sidebar-nav"
              selectedKeys={activeTabs}
              items={sidebarMenuItems}
              onClick={() => {
                if (!screens.md) {
                  setSidebarOpen(false);
                }
              }}
            />
            <StyledSidebarUtilityMenu>
              <RightMenu
                align="flex-start"
                settings={settings}
                navbarRight={navbarRight}
                isFrontendRoute={isFrontendRoute}
                environmentTag={environmentTag}
                layout="vertical"
                showActionDropdown={false}
                showThemeMenu={false}
                showLanguageMenu={!screens.lg}
                showSettingsMetaItems={false}
                showExtraLinks={false}
              />
            </StyledSidebarUtilityMenu>
          </StyledSidebarPanel>
        </>
      )}

      <StyledHeader className="top" id="main-menu" role="navigation">
        <StyledRow>
          <StyledCol md={24} xs={24}>
            <StyledHeaderLeft>
              {!shouldHideSidebar && (
                <StyledSidebarToggle
                  $dark={isDarkMode}
                  type="button"
                  aria-label={t('Toggle menu')}
                  onClick={() => setSidebarOpen(open => !open)}
                >
                  {isSidebarOpen ? (
                    <Icons.CaretLeftOutlined iconSize="m" />
                  ) : (
                    <Icons.MenuOutlined iconSize="m" />
                  )}
                </StyledSidebarToggle>
              )}
              <Tooltip
                id="brand-tooltip"
                placement="bottomLeft"
                title={brand.tooltip}
                arrow={{ pointAtCenter: true }}
              >
                {renderBrand()}
              </Tooltip>
              {brand.text && (
                <StyledBrandText>
                  <span>{brand.text}</span>
                </StyledBrandText>
              )}
            </StyledHeaderLeft>
            <StyledHeaderActions>
              {!isAnonymousUser && (
                <StyledPortalButton
                  to="/dashboard/list/"
                  aria-label={t('Portal')}
                >
                  <Icons.AppstoreOutlined iconSize="l" />
                </StyledPortalButton>
              )}
              <RightMenu
                align="flex-end"
                settings={settings}
                navbarRight={navbarRight}
                isFrontendRoute={isFrontendRoute}
                environmentTag={{ text: '', color: 'default' }}
                layout="horizontal"
                showActionDropdown
                showThemeMenu={false}
                showLanguageMenu={!!screens.lg}
                showSettingsMenu={false}
                showUserMenu
                showSettingsMetaItems={false}
                showExtraLinks={false}
              />
            </StyledHeaderActions>
          </StyledCol>
        </StyledRow>
      </StyledHeader>
    </>
  );
}

// transform the menu data to reorganize components
export default function MenuWrapper({ data, ...rest }: MenuProps) {
  const newMenuData = {
    ...data,
  };
  // Menu items that should go into settings dropdown
  const settingsMenus = {
    Data: true,
    Security: true,
    Manage: true,
  };

  // Cycle through menu.menu to build out cleanedMenu and settings
  const cleanedMenu: MenuObjectProps[] = [];
  const settings: MenuObjectProps[] = [];
  newMenuData.menu.forEach((item: any) => {
    if (!item) {
      return;
    }

    const children: (MenuObjectProps | string)[] = [];
    const newItem = {
      ...item,
    };

    // Filter childs
    if (item.childs) {
      item.childs.forEach((child: MenuObjectChildProps | string) => {
        if (typeof child === 'string') {
          children.push(child);
        } else if ((child as MenuObjectChildProps).label) {
          children.push(child);
        }
      });

      newItem.childs = children;
    }

    if (!settingsMenus.hasOwnProperty(item.name)) {
      cleanedMenu.push(newItem);
    } else {
      settings.push(newItem);
    }
  });

  newMenuData.menu = cleanedMenu;
  newMenuData.settings = settings;

  return <Menu data={newMenuData} {...rest} />;
}
