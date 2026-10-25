import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useThemeStore, THEME_MODES } from '../../store/themeStore';
import Header from './Header';
import TabsBar from './TabsBar';
import KeyboardShortcutBar from './KeyboardShortcutBar';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';
import { useSocket } from '../../hooks/useSocket';
import { useGlobalKeyboard } from '../../hooks/useGlobalKeyboard';

export default function AppLayout() {
    const { themeMode } = useThemeStore();

    // Initialize global keyboard shortcuts and system controls
    useGlobalKeyboard();

    // Sync dark mode class on document.documentElement for Tailwind dark: variants
    useEffect(() => {
        if (themeMode === THEME_MODES.DARK) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [themeMode]);

    // Initialize real-time socket notifications
    useSocket();

    const layoutBgClass = {
        [THEME_MODES.SOFT]: 'bg-[#EAEFF4]',
        [THEME_MODES.PURE]: 'bg-gray-50',
        [THEME_MODES.DARK]: 'bg-slate-900',
    }[themeMode] || 'bg-[#EAEFF4]';

    return (
        <div className={`h-screen h-[100dvh] flex flex-col ${layoutBgClass} overflow-hidden transition-colors duration-200`}>
            {/* Top Global Header */}
            <Header />

            {/* Top Multi-Tab Navigation Bar */}
            <TabsBar />

            {/* Main Application Content Area */}
            <main id="main-content" className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6 pb-16 min-w-0">
                <Outlet />
            </main>

            {/* Global Keyboard Shortcut Bottom Bar */}
            <KeyboardShortcutBar />

            {/* Global Keyboard Shortcuts Cheat Sheet Modal */}
            <KeyboardShortcutsModal />
        </div>
    );
}