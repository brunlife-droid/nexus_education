import type { Metadata } from "next";
import {
  Inter,
  Source_Serif_4,
  JetBrains_Mono,
  Atkinson_Hyperlegible,
} from "next/font/google";
import "./globals.css";
import { getCurrentTenant } from "@/lib/tenants/server";
import { TenantStyle, TenantSwitcher } from "@/components/tenant";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Nexus Education",
  description:
    "Plataforma de IA pedagógica para redes municipais de educação. Tutor IA por prefeitura, copiloto para professores, dashboards estratégicos para secretarias.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tenant = await getCurrentTenant();

  return (
    <html
      lang="pt-BR"
      data-theme="light"
      data-density="medium"
      data-a11y="none"
      data-tenant={tenant.id}
      className={`${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable} ${atkinson.variable} h-full antialiased`}
    >
      <head>
        <TenantStyle tenant={tenant} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <TenantSwitcher current={tenant.id} />
      </body>
    </html>
  );
}
