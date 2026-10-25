import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTabStore } from '../store/tabStore';
import { useKeyboardStore } from '../store/keyboardStore';
import { useThemeStore, THEME_MODES } from '../store/themeStore';
import toast from 'react-hot-toast';

export function useGlobalKeyboard() {
    const navigate = useNavigate();
    const location = useLocation();
    const { 
        tabs, 
        activeTab, 
        switchToNextTab, 
        switchToPrevTab, 
        closeActiveTab, 
        closeOthers,
        setActiveTab 
    } = useTabStore();
    const { 
        isShortcutsModalOpen, 
        toggleShortcutsModal, 
        closeShortcutsModal 
    } = useKeyboardStore();
    const { themeMode, setThemeMode } = useThemeStore();

    useEffect(() => {
        const handleKeyDown = (e) => {
            const target = e.target;
            const isTyping = 
                target && (
                    target.tagName === 'INPUT' || 
                    target.tagName === 'TEXTAREA' || 
                    target.tagName === 'SELECT' || 
                    target.isContentEditable
                );

            // 1. Global Escape handling
            if (e.key === 'Escape') {
                if (isShortcutsModalOpen) {
                    e.preventDefault();
                    closeShortcutsModal();
                    return;
                }
                if (isTyping) {
                    target.blur();
                    return;
                }
            }

            // 2. Alt + Combinations (Navigation & System-wide actions work even when typing!)
            if (e.altKey) {
                // Alt + ArrowRight OR Alt + ] -> Next Tab
                if (e.key === 'ArrowRight' || e.key === ']') {
                    e.preventDefault();
                    switchToNextTab(navigate);
                    return;
                }

                // Alt + ArrowLeft OR Alt + [ -> Prev Tab
                if (e.key === 'ArrowLeft' || e.key === '[') {
                    e.preventDefault();
                    switchToPrevTab(navigate);
                    return;
                }

                // Alt + W -> Close Active Tab (prevent browser tab closing!)
                if (e.key === 'w' || e.key === 'W') {
                    e.preventDefault();
                    if (e.shiftKey) {
                        closeOthers(activeTab, navigate);
                        toast.success('Closed other tabs');
                    } else {
                        if (activeTab !== '/') {
                            closeActiveTab(navigate);
                        } else {
                            toast('App Hub cannot be closed', { icon: 'ℹ️' });
                        }
                    }
                    return;
                }

                // Alt + H OR Alt + Home -> Go to App Hub
                if (e.key === 'h' || e.key === 'H' || e.key === 'Home') {
                    e.preventDefault();
                    setActiveTab('/');
                    navigate('/');
                    return;
                }

                // Alt + T -> Toggle Theme Mode
                if (e.key === 't' || e.key === 'T') {
                    e.preventDefault();
                    const modes = [THEME_MODES.SOFT, THEME_MODES.PURE, THEME_MODES.DARK];
                    const nextIndex = (modes.indexOf(themeMode) + 1) % modes.length;
                    const nextMode = modes[nextIndex];
                    setThemeMode(nextMode);
                    const label = nextMode === THEME_MODES.SOFT ? 'Soft Slate' : nextMode === THEME_MODES.PURE ? 'Crisp White' : 'Classic Dark';
                    toast.success(`Theme: ${label}`);
                    return;
                }
            }

            // 3. Search shortcut: Ctrl + K or '/' when not typing
            if ((e.ctrlKey && (e.key === 'k' || e.key === 'K')) || (!isTyping && e.key === '/')) {
                e.preventDefault();
                // Priority: Hub search input, then any page search input
                const searchInput = 
                    document.getElementById('hub-search-input') || 
                    document.querySelector('input[data-shortcut="search"]') || 
                    document.querySelector('input[placeholder*="Search" i]') || 
                    document.querySelector('input[type="search"]');

                if (searchInput) {
                    searchInput.focus();
                    searchInput.select?.();
                }
                return;
            }

            // 4. Open Shortcuts Modal with '?' or 'F1' when not typing
            if (!isTyping) {
                if (e.key === '?' || (e.shiftKey && e.key === '/') || e.key === 'F1') {
                    e.preventDefault();
                    toggleShortcutsModal();
                    return;
                }
            }

            // 5. Smooth scroll main content with PageUp/PageDown when not typing
            if (!isTyping) {
                const mainEl = document.getElementById('main-content');
                if (mainEl) {
                    if (e.key === 'PageDown') {
                        e.preventDefault();
                        mainEl.scrollBy({ top: 400, behavior: 'smooth' });
                    } else if (e.key === 'PageUp') {
                        e.preventDefault();
                        mainEl.scrollBy({ top: -400, behavior: 'smooth' });
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        navigate, 
        location.pathname, 
        activeTab, 
        tabs, 
        switchToNextTab, 
        switchToPrevTab, 
        closeActiveTab, 
        closeOthers, 
        setActiveTab, 
        isShortcutsModalOpen, 
        toggleShortcutsModal, 
        closeShortcutsModal, 
        themeMode, 
        setThemeMode
    ]);
}
