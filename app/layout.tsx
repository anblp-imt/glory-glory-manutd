import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { NavLink } from '@/components/NavLink';
import { Footer } from '@/components/Footer';
import { buildMetadata, buildJsonLd, SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION } from '@/lib/seo';
import styles from './layout.module.css';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  ...buildMetadata({ title: SITE_NAME, description: DEFAULT_DESCRIPTION, path: '/' }),
  appleWebApp: { title: 'Glory Glory', statusBarStyle: 'black-translucent' },
};

export const viewport = { themeColor: '#0d0d0d' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd()).replace(/</g, '\\u003c') }}
        />
        <header>
          <nav className={styles.nav}>
            <NavLink href="/">Match</NavLink>
            <NavLink href="/standings">Standings</NavLink>
            <NavLink href="/stats">Stats</NavLink>
            <NavLink href="/team">Team</NavLink>
            <NavLink href="/news">News</NavLink>
            <span className={styles.chant}>Glory Glory Man United</span>
          </nav>
        </header>
        {children}
        <Footer />
      </body>
    </html>
  );
}
