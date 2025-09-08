import './globals.css';
import { Inter } from 'next/font/google';
import Providers from './providers';
import type { Metadata } from 'next';

const inter = Inter({ subsets: ['latin'] });

const BRAND = 'Pacelab Pvt. Ltd.';

export const metadata: Metadata = {
  title: {
    default: BRAND,
    template: `%s | ${BRAND}`,
  },
  description:
    'Modern Learning Management System — interactive courses and analytics for learners and admins.',
  keywords: [
    'learning management system',
    'lms',
    'online courses',
    'training',
    'education',
    'Pacelab',
  ],
  applicationName: BRAND,
  authors: [{ name: 'Developed by Coxdo Solutions' }],
  // Next.js Metadata type expects a singular 'creator' property (not 'creators')
  creator: 'Coxdo Solutions',
  publisher: 'Pacelab Pvt. Ltd. (Rental Owner)',
  metadataBase: new URL('https://lms.pacelab.in'),
  alternates: {
    canonical: 'https://lms.pacelab.in',
  },
  icons: {
    icon: '/meta.logo.png',
    shortcut: '/meta.logo.png',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: BRAND,
    description:
      'Modern Learning Management System — interactive courses, progress tracking and analytics for learners and admins.',
    url: 'https://lms.pacelab.in',
    siteName: BRAND,
    images: [
      {
        url: 'https://lms.pacelab.in/meta.logo.png',
        width: 1200,
        height: 630,
        alt: `${BRAND} logo`,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: BRAND,
    description:
      'Modern Learning Management System — interactive courses, progress tracking and analytics for learners and admins.',
    images: ['https://lms.pacelab.in/meta.logo.png'],
    site: '@yourhandle',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Extra meta tags that are safe to include in head for broader SEO/UX support */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="msapplication-TileImage" content="/meta.logo.png" />
        <meta name="msapplication-TileColor" content="#ffffff" />
        <meta name="theme-color" content="#ffffff" />

        {/* Apple Touch Icons for iOS */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

        {/* Favicons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />

        {/* Author meta (for legacy/user agents) */}
        <meta name="author" content="Developed by Coxdo Solutions | Rental Owner: Pacelab Pvt. Ltd." />
      </head>

      <body className={`${inter.className} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

