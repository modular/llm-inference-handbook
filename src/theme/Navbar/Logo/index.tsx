import React, { type ReactNode } from 'react'
import Link from '@docusaurus/Link'
import useBaseUrl from '@docusaurus/useBaseUrl'
import { useThemeConfig } from '@docusaurus/theme-common'
import ThemedImage from '@theme/ThemedImage'

export default function NavbarLogo(): ReactNode {
  const {
    navbar: { logo }
  } = useThemeConfig()
  const wordmarkLight = useBaseUrl(logo?.src ?? 'images/modular-logo-black.svg')
  const wordmarkDark = useBaseUrl(
    logo?.srcDark ?? logo?.src ?? 'images/modular-logo-white.svg'
  )
  const brandmark = useBaseUrl('images/modular-brandmark-dark.svg')

  return (
    <Link
      className="navbar__brand"
      href={logo?.href ?? 'https://www.modular.com'}
      target={logo?.target}
    >
      <div className="navbar__logo navbar__logo--wordmark">
        <ThemedImage
          sources={{ light: wordmarkLight, dark: wordmarkDark }}
          alt={logo?.alt ?? 'Modular'}
          width={logo?.width}
          height={logo?.height}
        />
      </div>
      <div className="navbar__logo navbar__logo--mark">
        <img
          src={brandmark}
          alt={logo?.alt ?? 'Modular'}
          width={24}
          height={24}
        />
      </div>
    </Link>
  )
}
