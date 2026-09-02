import React, { type ReactNode } from 'react'
import Link from '@docusaurus/Link'
import useBaseUrl from '@docusaurus/useBaseUrl'
import { useThemeConfig } from '@docusaurus/theme-common'

export default function NavbarLogo(): ReactNode {
  const { navbar } = useThemeConfig()
  // Always configured; see themeConfig.navbar.logo in docusaurus.config.ts.
  const logo = navbar.logo!
  const wordmark = useBaseUrl(logo.src)
  const brandmark = useBaseUrl('images/modular-brandmark-dark.svg')

  return (
    <Link className="navbar__brand" href={logo.href} target={logo.target}>
      <div className="navbar__logo navbar__logo--wordmark">
        <img
          src={wordmark}
          alt={logo.alt}
          width={logo.width}
          height={logo.height}
        />
      </div>
      {/* Sized by CSS, which renders it at different sizes in the navbar and
          the mobile drawer. */}
      <div className="navbar__logo navbar__logo--mark">
        <img src={brandmark} alt={logo.alt} />
      </div>
    </Link>
  )
}
