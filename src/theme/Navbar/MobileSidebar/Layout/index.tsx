import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {ThemeClassNames, useThemeConfig} from '@docusaurus/theme-common';
import {
  useNavbarMobileSidebar,
  useNavbarSecondaryMenu,
} from '@docusaurus/theme-common/internal';
import NavbarItem, {type Props as NavbarItemConfig} from '@theme/NavbarItem';
import type {Props} from '@theme/Navbar/MobileSidebar/Layout';

// Pages outside the docs plugin (the search page, 404) never register a
// secondary menu, so the drawer would otherwise open with an empty panel. Docs
// are mounted at the site root, so the base URL is the handbook's home.
function HandbookHomeLink(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  const mobileSidebar = useNavbarMobileSidebar();
  const href = useBaseUrl('/');

  return (
    <ul className="menu__list">
      <li className="menu__list-item">
        <Link
          className="menu__link"
          to={href}
          onClick={() => mobileSidebar.toggle()}>
          {siteConfig.title}
        </Link>
      </li>
    </ul>
  );
}

function MobileSidebarCtas(): ReactNode {
  const items = useThemeConfig().navbar.items as NavbarItemConfig[];
  const mobileSidebar = useNavbarMobileSidebar();

  if (items.length === 0) {
    return null;
  }

  return (
    <ul className="menu__list navbar-sidebar__ctas">
      {items.map((item, i) => (
        <NavbarItem
          mobile
          {...item}
          onClick={() => mobileSidebar.toggle()}
          key={i}
        />
      ))}
    </ul>
  );
}

// Upstream renders this drawer as a two-panel horizontal scroller: navbar items
// in a primary panel, page-contextual content (the docs sidebar) in a secondary
// one, with a back button between them. Here the docs sidebar is the only menu
// and the navbar CTAs are pinned below it, so both the primary panel and its
// back button are dropped. The secondary menu is read from context rather than
// the `secondaryMenu` prop because that prop renders the back button.
export default function NavbarMobileSidebarLayout({header}: Props): ReactNode {
  const secondaryMenu = useNavbarSecondaryMenu();

  return (
    <div
      className={clsx(
        ThemeClassNames.layout.navbar.mobileSidebar.container,
        'navbar-sidebar',
      )}>
      {header}
      <div className="navbar-sidebar__items">
        <div
          className={clsx(
            ThemeClassNames.layout.navbar.mobileSidebar.panel,
            'navbar-sidebar__item menu',
          )}>
          {secondaryMenu.content ?? <HandbookHomeLink />}
        </div>
      </div>
      <MobileSidebarCtas />
    </div>
  );
}
