// src/app/layout.tsx
import type {Metadata} from "next";
import "./globals.css";

import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

import React, {ReactNode} from "react";
import {Navbar} from "@/components/Navbar";
import {AuthProvider} from "@/components/auth/AuthProvider";
import {AnalyticsTracker} from "@/components/AnalyticsTracker";
import {Inter} from "next/font/google";

export const metadata: Metadata = {
    title: "Quest Lab",
    description: "экспериментальная платформа для изучения IT",
};

const THEME_INIT_SCRIPT = `
(function() {
  try {
    var key = "dp-theme";
    var saved = localStorage.getItem(key);
    var theme = saved === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-color-mode", theme);
    document.documentElement.style.colorScheme = theme;
  } catch (e) {}
})();
`;

const inter = Inter({
    subsets: ["latin", "cyrillic"],
    display: "swap",
    variable: "--font-sans",
    weight: ["400", "500", "600", "700"],
});

export default function RootLayout({children}: { children: ReactNode }) {
    return (
        <html lang="ru" suppressHydrationWarning className={inter.variable}>
        <head>
            <link
                rel="stylesheet"
                href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,400,0,0&display=optional"
            />
            <script dangerouslySetInnerHTML={{__html: THEME_INIT_SCRIPT}}/>
        </head>

        <body className="min-h-screen bg-bg text-fg antialiased font-sans">
        <AuthProvider>
            <AnalyticsTracker/>
            <Navbar/>
            <div className="min-h-[calc(100vh-3.5rem)]">{children}</div>
        </AuthProvider>
        </body>
        </html>
    );
}
