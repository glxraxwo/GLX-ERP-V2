import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutGrid, X, MoreHorizontal, RotateCcw } from 'lucide-react';
import { useTabStore } from '../../store/tabStore';
import { findNavigationItem } from '../../config/navigationConfig';
import { useThemeStore, THEME_MODES } from '../../store/themeStore';

export default function TabsBar() {
    const location = useLocation();
    const navigate = useNavigate();
    const scrollContainerRef = useRef(null);
    const { tabs, activeTab, openTab, closeTab, closeOthers, closeAll, setActiveTab } = useTabStore();
    const { themeMode } = useThemeStore();

    const isDark = themeMode === THEME_MODES.DARK;
    const isSoft = themeMode === THEME_MODES.SOFT;

    // Automatically sync active tab when location changes
    useEffect(() => {
        const currentPath = location.pathname;
        if (currentPath === '/' || currentPath === '/hub') {
            setActiveTab('/');
            return;
        }

        // Find navigation configuration or generate a fallback title
        const navItem = findNavigationItem(currentPath);
        const title = navItem ? navItem.title : formatPathToTitle(currentPath);
        
        openTab({
            path: currentPath,
            title,
            iconName: navItem?.category || 'FileText',
            closable: true
        });
        setActiveTab(currentPath);
    }, [location.pathname]);

    // Auto-scroll the active tab into view
    useEffect(() => {
        if (!scrollContainerRef.current) return;
        const activeElement = scrollContainerRef.current.querySelector('[data-active="true"]');
        if (activeElement) {
            activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
    }, [activeTab]);

    // Enable horizontal mouse wheel scroll on tabs bar
    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const handleWheel = (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                el.scrollLeft += e.deltaY;
            }
        };
        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, []);

    const handleTabClick = (tab) => {
        setActiveTab(tab.path);
        navigate(tab.path);
    };

    const handleTabClose = (e, tab) => {
        e.stopPropagation();
        closeTab(tab.path, navigate);
    };

    // Style variables based on theme
    const barBg = isDark 
        ? 'bg-[#0B192C] border-b border-slate-800' 
        : isSoft 
            ? 'bg-[#E2E8F0] border-b border-slate-300' 
            : 'bg-slate-100 border-b border-gray-200';

    return (
        <div className={`no-print flex items-center justify-between px-3 sm:px-6 py-1.5 ${barBg} transition-colors select-none`}>
            {/* Scrollable Tabs List */}
            <div 
                ref={scrollContainerRef}
                className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth flex-1 min-w-0 py-0.5"
            >
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.path || (tab.path === '/' && (location.pathname === '/' || location.pathname === '/hub'));
                    const isHub = tab.path === '/';

                    const tabClass = isActive
                        ? isDark
                            ? 'bg-slate-800 text-white font-bold border-t-2 border-sky-400 shadow-sm'
                            : 'bg-white text-[#000865] font-bold border-t-2 border-[#000865] shadow-xs'
                        : isDark
                            ? 'bg-slate-900/60 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 font-medium'
                            : isSoft
                                ? 'bg-slate-300/60 text-slate-600 hover:bg-white/70 hover:text-slate-900 font-semibold'
                                : 'bg-slate-200/70 text-slate-600 hover:bg-white hover:text-slate-900 font-semibold';

                    return (
                        <div
                            key={tab.path}
                            data-active={isActive ? "true" : "false"}
                            onClick={() => handleTabClick(tab)}
                            className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all duration-150 flex-shrink-0 border border-transparent ${tabClass}`}
                            title={tab.title}
                        >
                            {isHub ? (
                                <LayoutGrid size={14} className={isActive ? (isDark ? 'text-sky-400' : 'text-[#000865]') : (isDark ? 'text-slate-400' : 'text-slate-500')} />
                            ) : null}
                            
                            <span className="truncate max-w-[140px] sm:max-w-[200px]">
                                {tab.title}
                            </span>

                            {tab.closable && (
                                <button
                                    onClick={(e) => handleTabClose(e, tab)}
                                    className="p-0.5 rounded-full hover:bg-slate-400/20 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                                    title="Close tab"
                                    aria-label={`Close ${tab.title}`}
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Quick Actions (Close Others / Close All) */}
            {tabs.length > 2 && (
                <div className="flex items-center gap-1 pl-2 flex-shrink-0">
                    <button
                        onClick={() => closeOthers(activeTab, navigate)}
                        className={`px-2 py-1 text-[11px] font-bold rounded-md transition ${
                            isDark 
                                ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                        }`}
                        title="Close all other tabs except active"
                    >
                        Close Others
                    </button>
                    <button
                        onClick={() => closeAll(navigate)}
                        className={`p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition ${
                            isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-200'
                        }`}
                        title="Close all tabs and return to Hub"
                    >
                        <RotateCcw size={13} />
                    </button>
                </div>
            )}
        </div>
    );
}

// Fallback path formatter for unregistered paths (e.g. /invoices/new -> Invoices New)
function formatPathToTitle(path) {
    if (!path || path === '/') return 'App Hub';
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 0) return 'App Hub';
    return parts
        .map(p => p.replace(/-/g, ' '))
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' › ');
}
