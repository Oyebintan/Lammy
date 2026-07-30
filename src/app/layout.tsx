import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Nav } from '@/components/layout/nav';
import { Footer } from '@/components/layout/footer';
import { ChatWidget } from '@/components/chat/chat-widget';
import { site } from '../../config/site.config';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.legalName, url: site.socials.github }],
  creator: site.legalName,
  keywords: [
    'Lammy',
    'Olamide',
    'portfolio',
    'product engineer',
    'design engineer',
    'Next.js',
    'TypeScript',
    'Nigeria',
  ],
  openGraph: {
    type: 'website',
    locale: site.locale,
    url: site.url,
    siteName: site.name,
    title: site.title,
    description: site.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: site.title,
    description: site.description,
    creator: site.twitterHandle,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Reveal machinery, deliberately inline and framework-free.

            It runs while the HTML is still parsing, so sections reveal as the
            browser reaches them rather than waiting on the React bundle. When
            this lived in a `useEffect`, the hidden state applied before first
            paint but only lifted after hydration — on a slow connection the
            page sat blank and scrolling did nothing for seconds.

            `revealAll` on a timer is the safety net: whatever happens to the
            observer, content is never left hidden. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var d=document,r=d.documentElement;r.classList.add('js');
function all(){d.querySelectorAll('.reveal').forEach(function(e){e.classList.add('is-visible')})}
if(!('IntersectionObserver'in window)){d.addEventListener('DOMContentLoaded',all);return}
var seen=new WeakSet(),io=new IntersectionObserver(function(es){es.forEach(function(e){
if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target)}})},
{rootMargin:'0px 0px 300px 0px'});
function scan(){d.querySelectorAll('.reveal').forEach(function(e){
if(!seen.has(e)){seen.add(e);io.observe(e)}})}
var mo=new MutationObserver(scan);mo.observe(r,{childList:true,subtree:true});
d.addEventListener('DOMContentLoaded',function(){scan();mo.disconnect()});
setTimeout(all,3000)})()`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-bg-0">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-fg focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-bg-0"
        >
          Skip to content
        </a>
        <Nav />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
        <ChatWidget />
      </body>
    </html>
  );
}
