import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const HUB_TAB = {
    id: '/',
    path: '/',
    title: 'App Hub',
    iconName: 'LayoutGrid',
    closable: false
};

export const useTabStore = create(
    persist(
        (set, get) => ({
            tabs: [HUB_TAB],
            activeTab: '/',

            // Persistent Hub state so navigating to a page and returning keeps exact category, search & scroll
            hubCategory: 'all',
            hubSearchQuery: '',
            hubScrollPosition: 0,

            setHubCategory: (hubCategory) => set({ hubCategory }),
            setHubSearchQuery: (hubSearchQuery) => set({ hubSearchQuery }),
            setHubScrollPosition: (hubScrollPosition) => set({ hubScrollPosition }),

            openTab: (tab) => {
                const { tabs } = get();
                const existingIndex = tabs.findIndex(t => t.path === tab.path);
                
                if (existingIndex >= 0) {
                    set({ activeTab: tab.path });
                } else {
                    const newTab = {
                        id: tab.path,
                        path: tab.path,
                        title: tab.title,
                        iconName: tab.iconName || 'FileText',
                        closable: tab.closable !== false
                    };
                    set({
                        tabs: [...tabs, newTab],
                        activeTab: tab.path
                    });
                }
            },

            setActiveTab: (path) => {
                set({ activeTab: path });
            },

            closeTab: (path, navigate) => {
                const { tabs, activeTab } = get();
                if (path === '/') return; // Never close Hub

                const tabIndex = tabs.findIndex(t => t.path === path);
                if (tabIndex === -1) return;

                const newTabs = tabs.filter(t => t.path !== path);
                
                let nextActivePath = activeTab;
                if (activeTab === path) {
                    // Closed current tab, switch to left neighbor
                    const nextIndex = Math.max(0, tabIndex - 1);
                    nextActivePath = newTabs[nextIndex]?.path || '/';
                }

                set({
                    tabs: newTabs,
                    activeTab: nextActivePath
                });

                if (navigate && activeTab === path) {
                    navigate(nextActivePath);
                }
            },

            closeOthers: (currentPath, navigate) => {
                const { tabs } = get();
                const preservedTabs = tabs.filter(t => t.path === '/' || t.path === currentPath);
                set({
                    tabs: preservedTabs,
                    activeTab: currentPath
                });
                if (navigate && currentPath) {
                    navigate(currentPath);
                }
            },

            closeAll: (navigate) => {
                set({
                    tabs: [HUB_TAB],
                    activeTab: '/'
                });
                if (navigate) {
                    navigate('/');
                }
            }
        }),
        {
            name: 'glx-erp-open-tabs',
            partialize: (state) => ({ 
                tabs: state.tabs, 
                activeTab: state.activeTab,
                hubCategory: state.hubCategory,
                hubSearchQuery: state.hubSearchQuery,
                hubScrollPosition: state.hubScrollPosition,
            }),
        }
    )
);
