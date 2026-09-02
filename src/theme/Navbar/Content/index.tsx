/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { type ReactNode } from 'react'
import clsx from 'clsx'
import {
  useThemeConfig,
  ErrorCauseBoundary,
  ThemeClassNames
} from '@docusaurus/theme-common'
import {
  splitNavbarItems,
  useNavbarMobileSidebar
} from '@docusaurus/theme-common/internal'
import NavbarItem, { type Props as NavbarItemConfig } from '@theme/NavbarItem'
import SearchBar from '@theme/SearchBar'
import NavbarMobileSidebarToggle from '@theme/Navbar/MobileSidebar/Toggle'
import NavbarLogo from '@theme/Navbar/Logo'
import NavbarSearch from '@theme/Navbar/Search'
import Link from '@docusaurus/Link'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import { Group, rem, Text } from '@mantine/core'

function useNavbarItems() {
  return useThemeConfig().navbar.items as NavbarItemConfig[]
}

function NavbarItems({ items }: { items: NavbarItemConfig[] }): ReactNode {
  return (
    <>
      {items.map((item, i) => (
        <ErrorCauseBoundary
          key={i}
          onError={(error) =>
            new Error(
              `A theme navbar item failed to render.
Please double-check the following navbar item (themeConfig.navbar.items) of your Docusaurus config:
${JSON.stringify(item, null, 2)}`,
              { cause: error }
            )
          }
        >
          <NavbarItem {...item} />
        </ErrorCauseBoundary>
      ))}
    </>
  )
}

function NavbarContentLayout({
  left,
  right
}: {
  left: ReactNode
  right: ReactNode
}) {
  return (
    <div className="navbar__inner">
      <div
        className={clsx(
          ThemeClassNames.layout.navbar.containerLeft,
          'navbar__items'
        )}
      >
        {left}
      </div>
      <div
        className={clsx(
          ThemeClassNames.layout.navbar.containerRight,
          'navbar__items navbar__items--right'
        )}
      >
        {right}
      </div>
    </div>
  )
}

export default function NavbarContent(): ReactNode {
  const mobileSidebar = useNavbarMobileSidebar()
  const items = useNavbarItems()
  const [leftItems, rightItems] = splitNavbarItems(items)
  const searchBarItem = items.find((item) => item.type === 'search')
  const { siteConfig } = useDocusaurusContext()

  return (
    <NavbarContentLayout
      left={
        <>
          {!mobileSidebar.disabled && <NavbarMobileSidebarToggle />}
          <NavbarLogo />
          <Group
            gap={rem(12)}
            wrap="nowrap"
            className="flex-1 sm:flex-none navbar__subtitle"
          >
            <Text unstyled p={0} m={0}>
              /
            </Text>{' '}
            <Link
              href="/"
              className="text-black hover:text-black hover:no-underline"
            >
              {siteConfig.title}
            </Link>
          </Group>
          <NavbarItems items={leftItems} />
        </>
      }
      right={
        <>
          {!searchBarItem && (
            <NavbarSearch>
              <SearchBar />
            </NavbarSearch>
          )}
          <NavbarItems items={rightItems} />
        </>
      }
    />
  )
}
