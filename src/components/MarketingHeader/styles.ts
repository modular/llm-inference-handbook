const headerStyles = `:host {
  display: block;
  position: relative;
  z-index: 200;
  font-family: Inter, Arial, sans-serif;
  color: #020c13;
}

* {
  box-sizing: border-box;
}

a {
  color: inherit;
  text-decoration: none;
}

button {
  font: inherit;
}

button,
ul,
li,
h2 {
  margin: 0;
  padding: 0;
}

ul {
  list-style: none;
}

.mh-header {
  background: #fff;
  color: #020c13;
  position: relative;
  z-index: 200;
}

.mh-nav {
  align-items: center;
  display: flex;
  justify-content: center;
  min-height: 60px;
  padding: 0 var(--content-side-padding, 24px);
  position: relative;
  z-index: 99;
}

.mh-nav-wrap {
  align-items: center;
  display: flex;
  justify-content: space-between;
  max-width: var(--content-max-width, 1200px);
  min-height: 37px;
  position: relative;
  width: 100%;
}

.mh-logo {
  align-items: center;
  color: #020c13;
  display: inline-flex;
  height: 18px;
  outline-offset: 6px;
  width: 86px;
}

.mh-logo-svg {
  display: block;
  height: 18px;
  width: 86px;
}

.mh-desktop-nav {
  align-items: center;
  display: flex;
  gap: 4px;
  justify-content: center;
}

.mh-nav-item,
.mh-menu {
  display: flex;
}

.mh-menu {
  position: relative;
}

.mh-nav-link,
.mh-menu-trigger {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 0;
  color: #676d71;
  cursor: pointer;
  display: inline-flex;
  font-size: 13px;
  font-weight: 500;
  gap: 8px;
  line-height: 21px;
  min-height: 37px;
  padding: 8px 0 6px;
  position: relative;
  transition:
    border-color 160ms ease,
    color 160ms ease;
}

.mh-nav-link:hover,
.mh-menu-trigger:hover,
.mh-menu-trigger[aria-expanded='true'] {
  color: #676d71;
}

.mh-menu-trigger-label {
  position: relative;
}

.mh-menu-trigger-label::after {
  background: currentColor;
  bottom: -7px;
  content: '';
  height: 1px;
  left: 0;
  opacity: 0;
  position: absolute;
  right: 0;
  transition: opacity 160ms ease;
}

.mh-menu-trigger:hover .mh-menu-trigger-label::after,
.mh-menu-trigger[aria-expanded='true'] .mh-menu-trigger-label::after {
  opacity: 1;
}

.mh-nav-item {
  padding: 0 12px;
}

.mh-chevron {
  height: 7px;
  transition: transform 160ms ease;
  width: 7px;
}

.mh-actions,
.mh-mobile-actions {
  align-items: center;
  display: flex;
  gap: 8px;
}

.mh-secondary-cta,
.mh-primary-cta {
  align-items: center;
  border: 0;
  border-radius: 4px;
  display: inline-flex;
  font-size: 13px;
  font-weight: 500;
  justify-content: center;
  line-height: 17.5px;
  min-height: 34px;
  transition:
    background-color 160ms ease,
    color 160ms ease;
  white-space: nowrap;
}

.mh-secondary-cta {
  background: transparent;
  color: #637bff;
  padding: 8px 10px;
}

.mh-secondary-cta:hover {
  background: rgba(99, 123, 255, 0.08);
  color: #637bff;
}

.mh-primary-cta {
  background: rgba(99, 123, 255, 0.12);
  color: #637bff;
  padding: 8px 12px;
}

.mh-primary-cta:hover {
  background: rgba(99, 123, 255, 0.18);
  color: #637bff;
}

.mh-mega-menu {
  left: 50%;
  padding-top: 11px;
  position: absolute;
  top: 100%;
  transform: translateX(calc(-50% + var(--mh-menu-x-offset, 0px)));
  width: min(340px, calc(100vw - 48px));
  z-index: 200;
}

.mh-mega-menu[hidden],
.mh-mobile-menu[hidden] {
  display: none;
}

.mh-mega-panel {
  background: #fff;
  border: 1px solid rgba(2, 12, 19, 0.1);
  border-radius: 8px;
  box-shadow: 0 18px 50px rgba(2, 12, 19, 0.12);
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(280px, 1fr);
  padding: 20px;
}

.mh-mega-menu-wide {
  width: min(740px, calc(100vw - 48px));
}

.mh-mega-menu-wide .mh-mega-panel {
  column-gap: 36px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-height: 220px;
}

.mh-mega-menu-solutions .mh-mega-panel {
  grid-template-columns: 1fr;
  min-height: 0;
}

.mh-mega-menu-solutions .mh-mega-group {
  grid-column: 1;
}

.mh-mega-menu-solutions .mh-mega-list {
  column-gap: 36px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  row-gap: 18px;
}

.mh-mega-menu-resources .mh-mega-panel {
  grid-template-columns: 1fr;
  min-height: 0;
}

.mh-mega-menu-resources .mh-mega-group {
  grid-column: 1;
}

.mh-mega-menu-resources .mh-mega-list {
  column-gap: 36px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  row-gap: 18px;
}

.mh-mega-group {
  min-width: 0;
}

.mh-mega-title,
.mh-mobile-subgroup-title {
  color: #676d71;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  line-height: 15px;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.mh-mega-list {
  display: grid;
  gap: 4px;
}

.mh-mega-link {
  align-items: center;
  border-radius: 6px;
  color: #020c13;
  display: flex;
  gap: 20px;
  justify-content: space-between;
  margin: 0 -12px;
  min-height: 56px;
  overflow: hidden;
  padding: 10px 12px;
  position: relative;
  transition:
    background-color 160ms ease,
    color 160ms ease;
}

.mh-mega-link:hover {
  background: var(--ifm-menu-color-background-hover);
}

.mh-mega-copy {
  display: grid;
  gap: 2px;
}

.mh-mega-link-label {
  color: #020c13;
  font-size: 14px;
  font-weight: 500;
  line-height: 18px;
}

.mh-mega-link-description {
  color: #676d71;
  font-size: 12px;
  font-weight: 400;
  line-height: 16px;
}

.mh-mega-icon {
  color: #676d71;
  flex: 0 0 auto;
  height: 24px;
  opacity: 1;
  transition:
    color 160ms ease,
    transform 160ms ease;
  width: 24px;
}

.mh-mega-link:hover .mh-mega-icon {
  color: #020c13;
  transform: translate(2px, -2px);
}

.mh-mega-icon svg,
.mh-mega-icon img {
  display: block;
  height: 100%;
  object-fit: contain;
  width: 100%;
}

.mh-mega-cta {
  align-items: center;
  border: 1px solid rgba(2, 12, 19, 0.12);
  border-radius: 6px;
  color: #020c13;
  display: flex;
  font-size: 14px;
  font-weight: 500;
  justify-content: center;
  min-height: 44px;
  padding: 10px 14px;
}

.mh-search-trigger,
.mh-mobile-toggle {
  align-items: center;
  background: transparent;
  border: 0;
  color: #020c13;
  cursor: pointer;
  display: none;
  gap: 8px;
  min-height: 37px;
  padding: 8px 0;
}

.mh-search-icon {
  height: 20px;
  width: 20px;
}

.mh-mobile-toggle-lines {
  display: grid;
  gap: 4px;
  width: 20px;
}

.mh-mobile-toggle-lines span {
  background: currentColor;
  display: block;
  height: 1px;
  width: 20px;
}

.mh-mobile-toggle-label {
  color: #676d71;
  font-size: 12px;
  line-height: 16px;
  text-transform: lowercase;
}

.mh-mobile-backdrop {
  background: rgba(2, 12, 19, 0.45);
  bottom: 0;
  left: 0;
  position: fixed;
  right: 0;
  top: 60px;
  z-index: 180;
}

.mh-mobile-backdrop[hidden] {
  display: none;
}

.mh-mobile-menu {
  -webkit-overflow-scrolling: touch;
  background: #fff;
  border-top: 1px solid rgba(2, 12, 19, 0.08);
  box-shadow: 0 18px 50px rgba(2, 12, 19, 0.18);
  display: flex;
  flex-direction: column;
  left: 0;
  max-height: calc(100vh - 60px);
  position: fixed;
  right: 0;
  top: 60px;
  z-index: 190;
}

/* Segmented control (visually approximates Mantine's SegmentedControl; no
   runtime dependency since it must render inside the header's Shadow DOM). */
.mh-tab-track {
  background: #f1f3f5;
  border-radius: 0;
  display: grid;
  gap: 2px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 20px 24px 0;
  padding: 3px;
  position: relative;
}

.mh-tab-pill {
  background: #637bff;
  border-radius: 0;
  height: calc(100% - 6px);
  left: 3px;
  position: absolute;
  top: 3px;
  transition: transform 200ms ease;
  width: calc(50% - 3px);
  z-index: 0;
}

.mh-tab-btn {
  background: transparent;
  border: 0;
  border-radius: 0;
  color: #676d71;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 0;
  position: relative;
  transition: color 160ms ease;
  z-index: 1;
}

.mh-tab-btn[aria-selected='true'] {
  color: #fff;
}

.mh-tab-panels {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px 28px;
}

.mh-tab-panel[hidden] {
  display: none;
}

/* Handbook tab: live sidebar tree */
.mh-toc-welcome {
  border-bottom: 1px solid rgba(2, 12, 19, 0.08);
  border-radius: 0;
  color: #020c13;
  display: block;
  font-size: 14px;
  font-weight: 500;
  /* Bleed the highlight beyond the text's own alignment (like the article
     items further down) so the current-page background reads as a proper
     inset block instead of hugging the label text. */
  margin: 0 -8px 6px;
  padding: 8px 8px;
}

.mh-toc-welcome.current {
  background: rgba(99, 123, 255, 0.12);
  border-radius: 0;
  color: #637bff;
  font-weight: 600;
}

.mh-toc-category {
  padding: 4px 0;
}

.mh-toc-category-header {
  align-items: center;
  background: none;
  border: 0;
  color: #676d71;
  cursor: pointer;
  display: flex;
  font-size: 11.5px;
  font-weight: 700;
  justify-content: space-between;
  letter-spacing: 0.04em;
  padding: 10px 4px;
  text-transform: uppercase;
  width: 100%;
}

.mh-toc-category-header .mh-chevron {
  transition: transform 160ms ease;
}

.mh-toc-category.expanded .mh-toc-category-header .mh-chevron {
  transform: rotate(180deg);
}

.mh-toc-category-items {
  display: none;
}

.mh-toc-category.expanded .mh-toc-category-items {
  display: grid;
  gap: 2px;
}

.mh-toc-article {
  border-radius: 0;
  color: #020c13;
  display: block;
  font-size: 14px;
  font-weight: 500;
  padding: 8px 4px 8px 18px;
}

.mh-toc-article.current {
  background: rgba(99, 123, 255, 0.12);
  color: #637bff;
  font-weight: 600;
}

.mh-toc-empty {
  color: #676d71;
  font-size: 13px;
  padding: 16px 4px;
}

.mh-mobile-list {
  display: grid;
  gap: 18px;
}

.mh-mobile-top-link,
.mh-mobile-group-title {
  color: #020c13;
  display: block;
  font-size: 20px;
  font-weight: 500;
  line-height: 26px;
}

.mh-mobile-group {
  display: grid;
  gap: 12px;
}

.mh-mobile-subgroup {
  display: grid;
  gap: 8px;
}

.mh-mobile-links {
  display: grid;
  gap: 4px;
}

.mh-mobile-link {
  border-radius: 6px;
  color: #020c13;
  display: grid;
  gap: 2px;
  padding: 8px 0;
}

.mh-mobile-link span {
  font-size: 14px;
  font-weight: 500;
  line-height: 18px;
}

.mh-mobile-link small {
  color: #676d71;
  font-size: 12px;
  font-weight: 400;
  line-height: 16px;
}

.mh-mobile-actions {
  border-top: 1px solid rgba(2, 12, 19, 0.08);
  margin-top: 20px;
  padding-top: 20px;
}

.mh-sr-only {
  border: 0;
  clip: rect(0, 0, 0, 0);
  height: 1px;
  margin: -1px;
  overflow: hidden;
  padding: 0;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}

.mh-header :focus {
  outline: none;
}

.mh-header :focus-visible {
  outline: 2px solid #ff4c1f;
  outline-offset: 3px;
}

@media (max-width: 1100px) {
  .mh-nav-wrap {
    gap: 20px;
  }

  .mh-desktop-nav {
    gap: 0;
  }

  .mh-nav-link,
  .mh-menu-trigger {
    padding-left: 8px;
    padding-right: 8px;
  }
}

@media (max-width: 991px) {
  .mh-nav {
    justify-content: stretch;
  }

  .mh-desktop-nav,
  .mh-actions > .mh-secondary-cta,
  .mh-actions > .mh-primary-cta {
    display: none;
  }

  .mh-search-trigger,
  .mh-mobile-toggle {
    display: inline-flex;
  }

  .mh-mobile-actions .mh-secondary-cta,
  .mh-mobile-actions .mh-primary-cta {
    flex: 1;
  }
}

@media (max-width: 520px) {
  .mh-nav {
    padding: 0 20px;
  }

  .mh-tab-track {
    margin: 18px 20px 0;
  }

  .mh-tab-panels {
    padding: 14px 20px 24px;
  }

  .mh-mobile-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
`;

export default headerStyles;
