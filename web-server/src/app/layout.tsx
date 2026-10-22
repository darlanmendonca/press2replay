import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Press2Replay",
  description: "Carrega no botão e recebe o replay da tua jogada no telemóvel, em segundos.",
  openGraph: {
    title: "Press2Replay",
    description: "Carrega no botão e recebe o replay da tua jogada no telemóvel, em segundos.",
    type: "website",
    locale: "pt_PT",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt" className={poppins.variable}>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
