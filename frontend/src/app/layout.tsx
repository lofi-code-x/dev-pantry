// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import React, { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { AuthProvider } from "@/components/auth/AuthProvider";

export const metadata: Metadata = {
    title: "Dev-Pantry",
    description: "Кладовая знаний о разработке",
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="ru">
        <body className="min-h-screen bg-white text-neutral-950 antialiased">
        <AuthProvider>
            <Navbar />
            <div className="min-h-[calc(100vh-3.5rem)]">{children}</div>
        </AuthProvider>
        </body>
        </html>
    );
}
