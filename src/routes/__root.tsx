import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/authContext";
import { BackgroundProvider } from "@/lib/backgroundContext";
import { CustomizationProvider } from "@/lib/customizationContext";
import { I18nProvider } from "@/lib/i18n";
import { SessionTimerProvider } from "@/lib/sessionTimerContext";
import { SecurityProvider } from "@/lib/securityContext";
import { StealthProvider } from "@/lib/stealthContext";
import { CartProvider } from "@/lib/cartContext";
import BackgroundMusic from "@/components/BackgroundMusic";
import SecurityHud from "@/components/SecurityHud";
import TorWarningBanner from "@/components/TorWarningBanner";
import CartIcon from "@/components/CartIcon";

import NotFound from "@/pages/NotFound";

const lightDev = import.meta.env.DEV && import.meta.env.VITE_LIGHT_DEV === "true";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AEIGSTHUB" },
      { name: "description", content: "AEIGSTHUB — Secure & Premium Digital Exchange" },
      { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
      { name: "referrer", content: "no-referrer" },
      {
        httpEquiv: "Content-Security-Policy",
        content:
          "default-src 'self'; script-src 'self' 'unsafe-inline' https://translate.google.com https://translate.googleapis.com; style-src 'self' 'unsafe-inline' https://translate.googleapis.com; img-src 'self' data: blob: https: http: https://translate.google.com https://translate.googleapis.com; font-src 'self' data:; connect-src 'self' https: wss: http: ws: https://*.supabase.co wss://*.supabase.co https://ai.gateway.lovable.dev https://translate.googleapis.com; frame-src 'self' https://www.youtube.com https://translate.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests",
      },
      { httpEquiv: "X-Frame-Options", content: "DENY" },
      { httpEquiv: "X-Content-Type-Options", content: "nosniff" },
      {
        httpEquiv: "Permissions-Policy",
        content: "geolocation=(), camera=(), microphone=(), interest-cohort=()",
      },
      { property: "og:title", content: "AEIGSTHUB" },
      { name: "twitter:title", content: "AEIGSTHUB" },
      { property: "og:description", content: "AEIGSTHUB — Secure & Premium Digital Exchange" },
      { name: "twitter:description", content: "AEIGSTHUB — Secure & Premium Digital Exchange" },
      { name: "twitter:card", content: "summary" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/970580a7-4a13-4203-855d-d50d1b3b480b/id-preview-3eed7cfb--23f3e47d-ec59-41ea-9cee-92e52c817735.lovable.app-1777477846218.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/970580a7-4a13-4203-855d-d50d1b3b480b/id-preview-3eed7cfb--23f3e47d-ec59-41ea-9cee-92e52c817735.lovable.app-1777477846218.png" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" className="dark bg-background">
      <head>
        <HeadContent />
        <style>{`
          ::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
          html, body {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          * {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          /* Google Translate Hiding */
          .goog-te-banner-frame.skiptranslate, .goog-te-gadget-icon {
            display: none !important;
          }
          body {
            top: 0 !important;
          }
          .goog-te-gadget-simple {
            background-color: transparent !important;
            border: none !important;
            padding: 0 !important;
          }
          .goog-te-gadget-simple span {
            display: none !important;
          }
          #google_translate_element {
            display: none !important;
          }
          .goog-tooltip {
            display: none !important;
          }
          .goog-tooltip:hover {
            display: none !important;
          }
          .goog-text-highlight {
            background-color: transparent !important;
            border: none !important;
            box-shadow: none !important;
          }
        `}</style>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              function googleTranslateElementInit() {
                new google.translate.TranslateElement({
                  pageLanguage: 'tr',
                  includedLanguages: 'en,ru,tr',
                  autoDisplay: false
                }, 'google_translate_element');
              }
            `,
          }}
        />
        <script src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit" />
      </head>
      <body>
        <div id="google_translate_element"></div>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthGuard({ children }: { children: ReactNode }) {
  const { user, role, logout } = useAuth();
  if (user && !role) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass-card neon-border rounded-lg p-6 w-full max-w-md text-center space-y-4">
          <div>
            <h1 className="text-2xl font-mono font-bold text-foreground drop-shadow-md">Nova<span className="text-primary neon-text">Market</span></h1>
            <p className="text-xs font-mono text-muted-foreground mt-2">
              Hesap yetkisi yüklenemedi.
            </p>
          </div>
          <button
            onClick={() => void logout()}
            className="w-full bg-primary text-primary-foreground py-3 rounded font-mono text-sm font-bold hover:opacity-90 transition-all"
          >
            Çıkış yap
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

function RootComponent() {
  const [queryClient] = useState(() => new QueryClient());
  const app = (
    <SessionTimerProvider>
      <I18nProvider>
        <CustomizationProvider>
          <BackgroundProvider>
            <StealthProvider>
              {!lightDev && <TorWarningBanner />}
              <AuthGuard>
                <CartProvider>
                  <Outlet />
                  <CartIcon />
                </CartProvider>
              </AuthGuard>
              {!lightDev && <SecurityHud />}
              {!lightDev && <BackgroundMusic />}
            </StealthProvider>
          </BackgroundProvider>
        </CustomizationProvider>
      </I18nProvider>
    </SessionTimerProvider>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <AuthProvider>
          {lightDev ? app : <SecurityProvider>{app}</SecurityProvider>}
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
