import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const THEME_MODES = {
    SOFT: 'soft',   // Soft Slate / Cool Gray (Reduces glare, eye-comfort)
    PURE: 'pure',   // Crisp Clean White
    DARK: 'dark',   // Classic Navy Dark
};

export const useThemeStore = create(
    persist(
        (set) => ({
            themeMode: THEME_MODES.SOFT, // Default to soft to relieve white intensity
            setThemeMode: (mode) => {
                if (typeof document !== 'undefined') {
                    if (mode === THEME_MODES.DARK) {
                        document.documentElement.classList.add('dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                    }
                }
                set({ themeMode: mode });
            },
        }),
        {
            name: 'glx-theme-storage',
            onRehydrateStorage: () => (state) => {
                if (typeof document !== 'undefined') {
                    if (state?.themeMode === THEME_MODES.DARK) {
                        document.documentElement.classList.add('dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                    }
                }
            }
        }
    )
);

// Apply immediately on bundle load
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
        const stored = JSON.parse(localStorage.getItem('glx-theme-storage') || '{}');
        if (stored?.state?.themeMode === THEME_MODES.DARK) {
            document.documentElement.classList.add('dark');
        }
    } catch (e) {}
}
