import React, { type ReactNode } from 'react'
import Link from '@docusaurus/Link'
import useBaseUrl from '@docusaurus/useBaseUrl'
import { useThemeConfig } from '@docusaurus/theme-common'
import ThemedImage from '@theme/ThemedImage'

export default function NavbarLogo(): ReactNode {
  const { navbar } = useThemeConfig()
  // Always configured; see themeConfig.navbar.logo in docusaurus.config.ts.
  const logo = navbar.logo!
  const logoSources = {
    light: useBaseUrl(logo.src),
    dark: useBaseUrl(logo.srcDark ?? logo.src)
  }
  const iconSources = {
    light: useBaseUrl('images/modular-icon-black.svg'),
    dark: useBaseUrl('images/modular-icon-white.svg')
  }

  return (
    <Link className="navbar__brand" href={logo.href} target={logo.target}>
      <div className="navbar__logo navbar__logo--wordmark">
        <ThemedImage
          alt={logo.alt}
          sources={logoSources}
          width={logo.width}
          height={logo.height}
        />
      </div>
      {/* Sized by CSS, which renders it at different sizes in the navbar and
          the mobile drawer. */}
      <div className="navbar__logo navbar__logo--mark">
        <ThemedImage alt={logo.alt} sources={iconSources} />
      </div>
    </Link>
  )
}
