import React, { type ReactNode, useEffect, useState } from 'react';
import { composeProviders } from '@docusaurus/theme-common';
import { useColorMode } from '@docusaurus/theme-common';
import {
  ColorModeProvider,
  AnnouncementBarProvider,
  ScrollControllerProvider,
  NavbarProvider,
  PluginHtmlClassNameProvider,
} from '@docusaurus/theme-common/internal';
import { DocsPreferredVersionContextProvider } from '@docusaurus/plugin-content-docs/client';
import type { Props } from '@theme/Layout/Provider';
import {
  MantineProvider,
  useMantineColorScheme,
  type MantineColorSchemeManager,
} from '@mantine/core';
import '@mantine/core/styles.css';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';
import theme, { cssVariablesResolver } from '@site/dls/handbookTheme';

// Docusaurus owns color-mode persistence and cross-tab synchronization. Read
// its pre-paint result during hydration without creating a competing Mantine
// localStorage key or storage-event listener.
const docusaurusColorSchemeManager: MantineColorSchemeManager = {
  get: (defaultColorScheme) => {
    if (typeof document === 'undefined') return defaultColorScheme;

    const colorScheme = document.documentElement.dataset.theme;
    return colorScheme === 'light' || colorScheme === 'dark'
      ? colorScheme
      : defaultColorScheme;
  },
  set: () => {},
  subscribe: () => {},
  unsubscribe: () => {},
  clear: () => {},
};

function MantineProviderWithTheme({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <MantineProvider
      colorSchemeManager={docusaurusColorSchemeManager}
      defaultColorScheme="light"
      theme={theme(
        'Inter',
        'Roboto Mono,PT Mono,Courier New,Courier,monospace'
      )}
      cssVariablesResolver={cssVariablesResolver}
    >
      <Notifications />
      {children}
    </MantineProvider>
  );
}

function CoordinateColorMode({ children }: { children: ReactNode }): ReactNode {
  const { colorMode } = useColorMode();
  const { setColorScheme, colorScheme } = useMantineColorScheme();
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
    document.documentElement.setAttribute('data-has-hydrated', 'true');
  }, []);

  useEffect(() => {
    if (hasHydrated && colorScheme !== colorMode) {
      setColorScheme(colorMode);
    }
  }, [colorMode, colorScheme, setColorScheme, hasHydrated]);

  return children;
}

const Provider = composeProviders([
  MantineProviderWithTheme,
  ColorModeProvider,
  AnnouncementBarProvider,
  ScrollControllerProvider,
  DocsPreferredVersionContextProvider,
  PluginHtmlClassNameProvider,
  NavbarProvider,
  CoordinateColorMode,
]);

export default function LayoutProvider({ children }: Props): ReactNode {
  return <Provider>{children}</Provider>;
}
