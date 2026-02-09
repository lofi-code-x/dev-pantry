// frontend/src/types/jsx-shim.d.ts
import type { JSX as ReactJSX } from "react";

declare global {
    namespace JSX {
        // Делаем JSX.IntrinsicElements доступным глобально,
        // как этого ожидают некоторые зависимости.
        interface IntrinsicElements extends ReactJSX.IntrinsicElements {}
    }
}

export {};
