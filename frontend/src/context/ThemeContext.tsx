"use client";

import React, { createContext, useContext, useEffect, useState, useTransition } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: "light",
    toggleTheme: () => {},
    setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("light");
    const [, startTransition] = useTransition();

    useEffect(() => {
        // Read initial theme from document (which was set by anti-flicker script) or localStorage
        const docTheme = document.documentElement.getAttribute("data-theme") as Theme | null;
        const storedTheme = localStorage.getItem("theme") as Theme | null;

        const resolvedTheme: Theme =
            docTheme === "dark" || docTheme === "light"
                ? docTheme
                : storedTheme === "dark" || storedTheme === "light"
                ? storedTheme
                : window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light";

        setThemeState(resolvedTheme);
        applyTheme(resolvedTheme);

        // Listen for storage changes in other tabs
        const handleStorage = (e: StorageEvent) => {
            if (e.key === "theme" && (e.newValue === "dark" || e.newValue === "light")) {
                setThemeState(e.newValue);
                applyTheme(e.newValue);
            }
        };

        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, []);

    const applyTheme = (t: Theme) => {
        document.documentElement.setAttribute("data-theme", t);
        if (t === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    };

    const setTheme = (newTheme: Theme) => {
        startTransition(() => {
            setThemeState(newTheme);
            localStorage.setItem("theme", newTheme);
            applyTheme(newTheme);
        });
    };

    const toggleTheme = () => {
        const next = theme === "light" ? "dark" : "light";
        setTheme(next);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
