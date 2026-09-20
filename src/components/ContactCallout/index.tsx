import type { PropsWithChildren } from 'react';
import { Alert, Box } from '@mantine/core';
import clsx from 'clsx';
import { ChatBubbleIcon } from '@site/dls/icons';
import admonitionStyles from '@site/src/theme/Admonition/Layout/styles.module.scss';
import styles from './styles.module.scss';

const DEFAULT_HREF =
  'https://www.modular.com/request-demo?utm_source=llm_handbook';

interface ContactCalloutProps {
  /** Link target for the button. Defaults to the request-demo page. */
  href?: string;
  /** Button label. Defaults to "Talk to us". */
  label?: string;
  /** Optional title, rendered like an admonition title. */
  title?: string;
}

/**
 * An admonition-shaped callout in the Nebula brand blue with a
 * call-to-action button. Use it for the "we can help with this" blurbs at
 * the end of a section.
 */
function ContactCallout({
  children,
  href = DEFAULT_HREF,
  label = 'Talk to us',
  title,
}: PropsWithChildren<ContactCalloutProps>) {
  return (
    <Alert
      color="blue"
      icon={<ChatBubbleIcon />}
      title={title}
      className={clsx(admonitionStyles.admonitionAlertRoot, styles.root)}
      aria-label="contact"
    >
      <Box className={admonitionStyles.admonitionAlertContent}>
        {children}
        <div className={styles.actions}>
          <a
            className="btn-outline"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {label}
          </a>
        </div>
      </Box>
    </Alert>
  );
}

export default ContactCallout;
