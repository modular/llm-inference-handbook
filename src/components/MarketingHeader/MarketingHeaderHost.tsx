import React, {
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useWindowSize } from '@docusaurus/theme-common';
import { useNavbarSecondaryMenu } from '@docusaurus/theme-common/internal';
import type { PropSidebar } from '@docusaurus/plugin-content-docs';
import SearchBar from '@theme/SearchBar';
import MarketingHeader from './MarketingHeader';
import headerStyles from './styles';

// The docs sidebar tree isn't reachable via React Context from here (see
// below), so we borrow it from the secondary-menu "teleport" that Docusaurus's
// own default `@theme/DocSidebar/Mobile` already feeds on every doc page, and
// read its raw props instead of rendering its (Infima-styled) element.
type SecondaryMenuProps = { sidebar?: PropSidebar; path?: string };

function useHandbookSidebarData(): { sidebar?: PropSidebar; activePath?: string } {
  const { content } = useNavbarSecondaryMenu();
  return useMemo(() => {
    if (!isValidElement(content)) {
      return {};
    }
    const props = content.props as SecondaryMenuProps;
    return { sidebar: props.sidebar, activePath: props.path };
  }, [content]);
}

export default function MarketingHeaderHost(): JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<Root | null>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);
  const searchMountRef = useRef<HTMLDivElement | null>(null);
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);
  const { sidebar, activePath } = useHandbookSidebarData();
  // The desktop sidebar renders its own SearchBar at >=997px, so only mount
  // this one below that to keep a single search instance (and a single
  // Cmd/Ctrl+K listener) per viewport.
  const isMobile = useWindowSize() === 'mobile';

  // The header's search button lives in the shadow root, where Docusaurus
  // context and DocSearch's stylesheet are both out of reach. So the real
  // SearchBar stays here in the light DOM, visually hidden, and the button
  // forwards taps to it.
  const openSearch = useCallback(() => {
    searchMountRef.current?.querySelector('button')?.click();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    setShadowRoot(root);

    if (!styleRef.current) {
      const style = document.createElement('style');
      style.textContent = headerStyles;
      root.appendChild(style);
      styleRef.current = style;
    }

    let mount = root.querySelector<HTMLDivElement>(
      '[data-marketing-header-root]'
    );
    if (!mount) {
      mount = document.createElement('div');
      mount.setAttribute('data-marketing-header-root', '');
      root.appendChild(mount);
    }

    if (!rootRef.current) {
      rootRef.current = createRoot(mount);
    }

    return () => {
      rootRef.current?.unmount();
      rootRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!rootRef.current || !shadowRoot) return;
    rootRef.current.render(
      <MarketingHeader
        shadowRoot={shadowRoot}
        handbookSidebar={sidebar}
        activePath={activePath}
        onSearchClick={isMobile ? openSearch : undefined}
      />
    );
  }, [shadowRoot, sidebar, activePath, isMobile, openSearch]);

  return (
    <>
      <div
        ref={hostRef}
        className="navbar"
        data-marketing-header-host
        style={{
          display: 'block',
          padding: 0,
          position: 'sticky',
          top: 0,
          zIndex: 200,
        }}
      />
      {isMobile && (
        <div ref={searchMountRef} className="handbook-mobile-search-mount">
          <SearchBar />
        </div>
      )}
    </>
  );
}
