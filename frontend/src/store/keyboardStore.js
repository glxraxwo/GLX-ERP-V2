import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useKeyboardStore = create(
    persist(
        (set) => ({
            isShortcutsModalOpen: false,
            isShortcutsBarVisible: true,
            isShortcutsBarMinimized: false,

            openShortcutsModal: () => set({ isShortcutsModalOpen: true }),
            closeShortcutsModal: () => set({ isShortcutsModalOpen: false }),
            toggleShortcutsModal: () => set((state) => ({ isShortcutsModalOpen: !state.isShortcutsModalOpen })),

            toggleShortcutsBar: () => set((state) => ({ isShortcutsBarVisible: !state.isShortcutsBarVisible })),
            toggleShortcutsBarMinimized: () => set((state) => ({ isShortcutsBarMinimized: !state.isShortcutsBarMinimized })),
            setShortcutsBarVisible: (val) => set({ isShortcutsBarVisible: val }),
        }),
        {
            name: 'glx-erp-keyboard-settings',
            partialize: (state) => ({
                isShortcutsBarVisible: state.isShortcutsBarVisible,
                isShortcutsBarMinimized: state.isShortcutsBarMinimized,
            }),
        }
    )
);
