import React, {type ReactNode} from 'react';
import {useThemeConfig} from '@docusaurus/theme-common';
import {
  useNavbarMobileSidebar,
  useNavbarSecondaryMenu,
} from '@docusaurus/theme-common/internal';
import NavbarItem, {type Props as NavbarItemConfig} from '@theme/NavbarItem';

function useNavbarItems() {
  return useThemeConfig().navbar.items as NavbarItemConfig[];
}

export default function NavbarMobileSidebarSecondaryMenu(): ReactNode {
  const secondaryMenu = useNavbarSecondaryMenu();
  const mobileSidebar = useNavbarMobileSidebar();
  const items = useNavbarItems();

  return (
    <>
      {secondaryMenu.content}
      {items.length > 0 && (
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
      )}
    </>
  );
}
