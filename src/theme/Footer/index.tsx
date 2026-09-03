import React, { type JSX } from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { useThemeConfig } from '@docusaurus/theme-common';
import styles from './styles.module.scss';

declare global {
  interface Window {
    Cookiebot?: { renew: () => void };
  }
}

export default function Footer(): JSX.Element | null {
  const { footer } = useThemeConfig();
  if (!footer) return null;

  const { logo, links } = footer;
  const flatLinks = (links ?? []).flatMap((group) =>
    'items' in group ? group.items : []
  );

  const logoBlack = useBaseUrl('images/modular-logo-black.svg');
  const logoWhite = useBaseUrl('images/modular-logo-white.svg');

  return (
    <footer className={styles.footer}>
      <div className={styles.bar}>
        <Link
          href={logo?.href ?? 'https://www.modular.com'}
          className={styles.logoLink}
        >
          <img
            src={logoBlack}
            alt={logo?.alt ?? 'Modular'}
            className={`${styles.logo} light`}
          />
          <img
            src={logoWhite}
            alt={logo?.alt ?? 'Modular'}
            className={`${styles.logo} dark`}
          />
        </Link>
        <nav className={styles.links}>
          {flatLinks.map((item) => (
            <Link
              key={item.label}
              href={item.href ?? item.to}
              className={styles.link}
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            className={`${styles.link} ${styles.privacyButton}`}
            onClick={() => window.Cookiebot?.renew()}
          >
            Privacy settings
          </button>
        </nav>
      </div>
    </footer>
  );
}
