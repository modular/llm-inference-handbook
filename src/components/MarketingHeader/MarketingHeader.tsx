import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { PropSidebar } from '@docusaurus/plugin-content-docs';
import {
  marketingHeaderCtas,
  marketingHeaderItems,
  type MarketingHeaderItem,
  type MarketingHeaderLink,
  type MarketingHeaderMenu,
} from './marketingHeaderData';
import { marketingHeaderIcons } from './marketingHeaderIcons';
import HandbookNavTree from './HandbookNavTree';

type Props = {
  shadowRoot: ShadowRoot;
  handbookSidebar?: PropSidebar;
  activePath?: string;
  onSearchClick?: () => void;
};

type MobileTab = 'handbook' | 'modular';

export default function MarketingHeader({
  shadowRoot,
  handbookSidebar,
  activePath,
  onSearchClick,
}: Props): JSX.Element {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const hasHandbookTab = Boolean(handbookSidebar && handbookSidebar.length > 0);
  // `handbookSidebar` arrives asynchronously from the outer root (see
  // MarketingHeaderHost) — it's undefined on the very first render, even on
  // doc pages. Rather than storing the *displayed* tab directly in state
  // (which would race with that first render and permanently lock onto
  // "modular"), we store only the user's explicit choice, if any, and fall
  // back to "handbook" whenever it's available and the user hasn't chosen
  // otherwise. This keeps tab selection correct regardless of data timing.
  const [userSelectedTab, setUserSelectedTab] = useState<MobileTab | null>(null);
  const mobileTab: MobileTab = userSelectedTab ?? (hasHandbookTab ? 'handbook' : 'modular');
  const navId = useId();
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    };

    const onPointerDown: EventListener = (event) => {
      const target = event.composedPath()[0];
      if (target instanceof Node && headerRef.current?.contains(target)) {
        return;
      }

      setOpenMenu(null);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    shadowRoot.addEventListener('pointerdown', onPointerDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
      shadowRoot.removeEventListener('pointerdown', onPointerDown);
    };
  }, [shadowRoot]);

  const closeMenus = () => setOpenMenu(null);

  return (
    <header ref={headerRef} className="mh-header">
      <nav className="mh-nav" aria-label="Main navigation">
        <div className="mh-nav-wrap">
          <a
            className="mh-logo"
            href="https://www.modular.com/"
            aria-label="Modular home"
          >
            <ModularLogo />
          </a>

          <ul className="mh-desktop-nav" role="list">
            {marketingHeaderItems.map((item) => (
              <li
                key={item.type === 'link' ? item.label : item.menu.label}
                className="mh-nav-item"
              >
                <HeaderItem
                  item={item}
                  openMenu={openMenu}
                  navId={navId}
                  setOpenMenu={setOpenMenu}
                  closeMenus={closeMenus}
                />
              </li>
            ))}
          </ul>

          <div className="mh-actions">
            <a
              className="mh-secondary-cta"
              href={marketingHeaderCtas.secondary.href}
            >
              {marketingHeaderCtas.secondary.label}
            </a>
            <a
              className="mh-primary-cta"
              href={marketingHeaderCtas.primary.href}
            >
              {marketingHeaderCtas.primary.label}
            </a>
            {onSearchClick ? (
              <button
                className="mh-search-trigger"
                type="button"
                onClick={onSearchClick}
              >
                <span className="mh-sr-only">Search</span>
                <SearchIcon />
              </button>
            ) : null}
            <button
              className="mh-mobile-toggle"
              type="button"
              aria-controls={`${navId}-mobile-menu`}
              aria-expanded={mobileOpen}
              onClick={() => {
                setOpenMenu(null);
                setMobileOpen((value) => !value);
              }}
            >
              <span className="mh-sr-only">Toggle navigation</span>
              <span className="mh-mobile-toggle-lines" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <span className="mh-mobile-toggle-label" aria-hidden="true">
                {mobileOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>
      </nav>

      <div
        className="mh-mobile-backdrop"
        hidden={!mobileOpen}
        aria-hidden="true"
        onClick={() => setMobileOpen(false)}
      />

      <div
        id={`${navId}-mobile-menu`}
        className="mh-mobile-menu"
        hidden={!mobileOpen}
      >
        {hasHandbookTab ? (
          <div className="mh-tab-track" role="tablist" aria-label="Mobile navigation">
            <span
              className="mh-tab-pill"
              style={{
                transform: `translateX(${mobileTab === 'handbook' ? '0%' : '100%'})`,
              }}
              aria-hidden="true"
            />
            <button
              type="button"
              className="mh-tab-btn"
              role="tab"
              aria-selected={mobileTab === 'handbook'}
              onClick={() => setUserSelectedTab('handbook')}
            >
              Inference Handbook
            </button>
            <button
              type="button"
              className="mh-tab-btn"
              role="tab"
              aria-selected={mobileTab === 'modular'}
              onClick={() => setUserSelectedTab('modular')}
            >
              Modular.com
            </button>
          </div>
        ) : null}

        <div className="mh-tab-panels">
          {hasHandbookTab ? (
            <div
              className="mh-tab-panel"
              role="tabpanel"
              hidden={mobileTab !== 'handbook'}
            >
              <HandbookNavTree
                sidebar={handbookSidebar!}
                activePath={activePath ?? ''}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          ) : null}

          <div
            className="mh-tab-panel"
            role="tabpanel"
            hidden={hasHandbookTab && mobileTab !== 'modular'}
          >
            <ul className="mh-mobile-list" role="list">
              {marketingHeaderItems.map((item) => (
                <li key={item.type === 'link' ? item.label : item.menu.label}>
                  {item.type === 'link' ? (
                    <a className="mh-mobile-top-link" href={item.href}>
                      {item.label}
                    </a>
                  ) : (
                    <MobileMenuGroup menu={item.menu} />
                  )}
                </li>
              ))}
            </ul>
            <div className="mh-mobile-actions">
              <a
                className="mh-secondary-cta"
                href={marketingHeaderCtas.secondary.href}
              >
                {marketingHeaderCtas.secondary.label}
              </a>
              <a
                className="mh-primary-cta"
                href={marketingHeaderCtas.primary.href}
              >
                {marketingHeaderCtas.primary.label}
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

type HeaderItemProps = {
  item: MarketingHeaderItem;
  openMenu: string | null;
  navId: string;
  setOpenMenu: (value: string | null) => void;
  closeMenus: () => void;
};

function HeaderItem({
  item,
  openMenu,
  navId,
  setOpenMenu,
  closeMenus,
}: HeaderItemProps): JSX.Element {
  if (item.type === 'link') {
    return (
      <a className="mh-nav-link" href={item.href} onClick={closeMenus}>
        <span>{item.label}</span>
      </a>
    );
  }

  const isOpen = openMenu === item.menu.label;
  const menuId = `${navId}-${slugify(item.menu.label)}-menu`;

  return (
    <div
      className="mh-menu"
      onMouseEnter={() => setOpenMenu(item.menu.label)}
      onMouseLeave={() => setOpenMenu(null)}
      onFocus={() => setOpenMenu(item.menu.label)}
    >
      <button
        className="mh-nav-link mh-menu-trigger"
        type="button"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setOpenMenu(isOpen ? null : item.menu.label)}
      >
        <span className="mh-menu-trigger-label">{item.menu.label}</span>
        <ChevronIcon />
      </button>
      <MegaMenu menu={item.menu} menuId={menuId} isOpen={isOpen} />
    </div>
  );
}

function MegaMenu({
  menu,
  menuId,
  isOpen,
}: {
  menu: MarketingHeaderMenu;
  menuId: string;
  isOpen: boolean;
}): JSX.Element {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isSolutionsMenu = menu.label === 'Solutions';
  const isResourcesMenu = menu.label === 'Resources';
  const isWideMenu =
    menu.groups.length > 1 || isSolutionsMenu || isResourcesMenu;

  useLayoutEffect(() => {
    const menuElement = menuRef.current;
    if (!isOpen || !menuElement) return;

    menuElement.style.setProperty('--mh-menu-x-offset', '0px');

    const margin = 16;
    const rect = menuElement.getBoundingClientRect();
    let offset = 0;

    if (rect.left < margin) {
      offset = margin - rect.left;
    } else if (rect.right > window.innerWidth - margin) {
      offset = window.innerWidth - margin - rect.right;
    }

    menuElement.style.setProperty('--mh-menu-x-offset', `${offset}px`);
  }, [isOpen]);

  return (
    <div
      ref={menuRef}
      id={menuId}
      className={[
        'mh-mega-menu',
        isWideMenu ? 'mh-mega-menu-wide' : '',
        isSolutionsMenu ? 'mh-mega-menu-solutions' : '',
        isResourcesMenu ? 'mh-mega-menu-resources' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      hidden={!isOpen}
    >
      <div className="mh-mega-panel">
        {menu.groups.map((group) => (
          <section key={group.title} className="mh-mega-group">
            <h2 className="mh-mega-title">{group.title}</h2>
            <ul className="mh-mega-list" role="list">
              {group.items.map((link) => (
                <li key={link.label}>
                  <a className="mh-mega-link" href={link.href}>
                    <span className="mh-mega-copy">
                      <span className="mh-mega-link-label">{link.label}</span>
                      {link.description ? (
                        <span className="mh-mega-link-description">
                          {link.description}
                        </span>
                      ) : null}
                    </span>
                    <span className="mh-mega-icon" aria-hidden="true">
                      <HeaderLinkIcon link={link} />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {menu.cta ? (
          <a className="mh-mega-cta" href={menu.cta.href}>
            {menu.cta.label}
          </a>
        ) : null}
      </div>
    </div>
  );
}

function MobileMenuGroup({ menu }: { menu: MarketingHeaderMenu }): JSX.Element {
  return (
    <div className="mh-mobile-group">
      <div className="mh-mobile-group-title">{menu.label}</div>
      {menu.groups.map((group) => (
        <div key={group.title} className="mh-mobile-subgroup">
          {menu.groups.length > 1 ? (
            <div className="mh-mobile-subgroup-title">{group.title}</div>
          ) : null}
          <ul className="mh-mobile-links" role="list">
            {group.items.map((link) => (
              <li key={link.label}>
                <a className="mh-mobile-link" href={link.href}>
                  <span>{link.label}</span>
                  {link.description ? <small>{link.description}</small> : null}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ModularLogo(): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className="mh-logo-svg"
      viewBox="0 0 94 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M30.2298 5.35211C26.4405 5.35211 23.4933 8.30986 23.4933 12.6761C23.4933 17.0423 26.4405 20 30.2298 20C34.019 20 36.9662 17.0423 36.9662 12.6761C36.9662 8.30986 34.019 5.35211 30.2298 5.35211ZM30.2298 18.0282C27.6755 18.0282 25.5985 15.9155 25.5985 12.6761C25.5985 9.43662 27.6755 7.32394 30.2298 7.32394C32.784 7.32394 34.8611 9.43662 34.8611 12.6761C34.8611 15.9155 32.784 18.0282 30.2298 18.0282ZM49.4006 7.60563H49.2602C48.1375 6.16901 46.7621 5.35211 44.7693 5.35211C41.0923 5.35211 38.3135 8.30986 38.3135 12.6761C38.3135 17.0423 41.0923 20 44.7693 20C46.7621 20 48.1375 19.1831 49.2602 17.7465H49.4006V19.7183H51.5057V0H49.4006V7.60563ZM44.9096 18.0282C42.5238 18.0282 40.4186 15.9155 40.4186 12.6761C40.4186 9.43662 42.5238 7.32394 44.9096 7.32394C47.2954 7.32394 49.4006 9.43662 49.4006 12.6761C49.4006 15.9155 47.2954 18.0282 44.9096 18.0282ZM63.5471 5.6338H65.6522V19.7183H63.5471V18.169H63.4067C63.098 18.5352 62.7612 18.8451 62.3401 19.0986C61.6384 19.5493 60.628 20 59.1965 20C55.9686 20 53.5828 17.6056 53.5828 14.0845V5.6338H55.6879V14.0845C55.6879 16.338 57.372 18.0282 59.4771 18.0282C61.7226 18.0282 63.5471 16.1972 63.5471 14.0845V5.6338ZM67.7293 0H69.8344V19.7183H67.7293V0ZM82.5214 7.60563H82.3811C81.2583 6.16901 79.883 5.35211 77.8901 5.35211C74.2131 5.35211 71.4343 8.30986 71.4343 12.6761C71.4343 17.0423 74.2131 20 77.8901 20C79.883 20 81.2583 19.1831 82.3811 17.7465H82.5214V19.7183H84.6265V5.6338H82.5214V7.60563ZM78.0304 18.0282C75.6446 18.0282 73.5395 15.9155 73.5395 12.6761C73.5395 9.43662 75.6446 7.32394 78.0304 7.32394C80.4163 7.32394 82.5214 9.43662 82.5214 12.6761C82.5214 15.9155 80.4163 18.0282 78.0304 18.0282ZM94 5.6338V7.60563H88.9491C88.8719 7.60563 88.8087 7.66901 88.8087 7.74648V19.7183H86.7036V7.60563H88.6684C88.7456 7.60563 88.8087 7.54225 88.8087 7.46479V5.6338H94ZM19.7883 2.95775H21.8934V19.7183H19.648V3.09859C19.648 3.02113 19.5848 2.95775 19.5076 2.95775H18.5252L12.6308 19.7183H9.26261L3.36822 2.95775H2.24548V19.7183H0V0H4.6313L10.666 17.1831H11.2274L17.2621 0H19.648V2.8169C19.648 2.89437 19.7111 2.95775 19.7883 2.95775Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ChevronIcon(): JSX.Element {
  return (
    <svg
      className="mh-chevron"
      viewBox="0 0 7 7"
      fill="none"
      aria-hidden="true"
    >
      <path d="M0.5 3L3.5 6L6.5 3" stroke="currentColor" />
    </svg>
  );
}

function SearchIcon(): JSX.Element {
  return (
    <svg
      className="mh-search-icon"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="8.75"
        cy="8.75"
        r="5.25"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M12.75 12.75L16.5 16.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArrowIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M13.4623 12.7124H11.9623V7.09814L5.81775 13.2427L4.7572 12.1821L10.9017 6.0376H5.28748V4.5376H13.4623V12.7124Z"
        fill="currentColor"
      />
    </svg>
  );
}

function HeaderLinkIcon({ link }: { link: MarketingHeaderLink }): JSX.Element {
  const iconMarkup = marketingHeaderIcons[link.href];

  if (!iconMarkup) {
    return <ArrowIcon />;
  }

  return <span dangerouslySetInnerHTML={{ __html: iconMarkup }} />;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
