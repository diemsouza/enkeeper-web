import "@/src/app/globals.css";
import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { ThemeProvider } from "@/src/components/providers/theme-provider";
import Script from "next/script";
import QueryProvider from "@/src/components/QueryProvider";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import ClientToaster from "../components/shared/client-toaster";

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const dynamic = "force-dynamic";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  //viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo.home"); // usa o locale do request.ts

  return {
    title: t("title"),
    description: t("description"),
    keywords: t("keywords"),
    robots: "index, nofollow, noimageindex",
    alternates: {
      canonical: "https://dropuz.com.br",
      languages: {
        "x-default": "https://dropuz.com.br",
        "pt-BR": "https://dropuz.com.br/?lang=pt",
      },
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="shortcut icon" href="/favicon.ico" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <meta name="apple-mobile-web-app-title" content="dropuz" />
        <link rel="manifest" href="/site.webmanifest" />
        {process.env.NEXT_PUBLIC_GTM_ID && (
          <Script
            strategy="afterInteractive"
            id="script_gtm"
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${process.env.NEXT_PUBLIC_GTM_ID}');`,
            }}
          />
        )}
      </head>
      <body className={figtree.className} suppressHydrationWarning>
        {process.env.NEXT_PUBLIC_GTM_ID && (
          <noscript
            dangerouslySetInnerHTML={{
              __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=${process.env.NEXT_PUBLIC_GTM_ID}"
height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
            }}
          ></noscript>
        )}
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            <QueryProvider>
              <ClientToaster />
              {children}
            </QueryProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
