// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

import React, { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { AuthProvider } from "@/components/auth/AuthProvider";

export const metadata: Metadata = {
    title: "Dev-Pantry",
    description: "Кладовая знаний о разработке",
};

const THEME_INIT_SCRIPT = `
(function() {
  try {
    var key = "dp-theme";
    var saved = localStorage.getItem(key);
    var theme = saved === "dark" ? "dark" : saved === "light" ? "light"
      : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

    // ✅ твоя тема (Tailwind tokens)
    document.documentElement.setAttribute("data-theme", theme);

    // ✅ важно для @uiw/react-md-editor
    document.documentElement.setAttribute("data-color-mode", theme);

    // ✅ системные элементы (скроллбар/формы)
    document.documentElement.style.colorScheme = theme;
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="ru" suppressHydrationWarning>
        <head>
            {/* Google Material Symbols */}
            <link
                rel="stylesheet"
                href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,400,0,0"
            />
            <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        </head>

        <body className="min-h-screen bg-bg text-fg antialiased">
        <AuthProvider>
            <Navbar />
            <div className="min-h-[calc(100vh-3.5rem)]">{children}</div>
        </AuthProvider>
        </body>
        </html>
    );
}
