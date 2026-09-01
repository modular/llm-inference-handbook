import React, {version, type ReactNode} from 'react';
import clsx from 'clsx';
import {ThemeClassNames} from '@docusaurus/theme-common';
import type {Props} from '@theme/Navbar/MobileSidebar/Layout';

function inertProps(inert: boolean) {
  const isBeforeReact19 = parseInt(version!.split('.')[0]!, 10) < 19;
  if (isBeforeReact19) {
    return {inert: inert ? '' : undefined} as unknown as {inert: boolean};
  }
  return {inert};
}

export default function NavbarMobileSidebarLayout({
  header,
  secondaryMenu,
}: Props): ReactNode {
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
          )}
          {...inertProps(false)}>
          {secondaryMenu}
        </div>
      </div>
    </div>
  );
}
