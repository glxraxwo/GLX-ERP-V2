import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon, Palette, Check, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore, THEME_MODES } from '../../store/themeStore';
import { useTabStore } from '../../store/tabStore';
import { usePermission } from '../../hooks/usePermission';
import { useLowStockAlertCount } from '../../features/stock/useStock';
import { authApi } from '../../features/auth/authApi';
import { useSettings } from '../../features/settings/useSettings';
import NotificationDropdown from '../ui/NotificationDropdown';
import logo from '../../assets/logo.jpg';

export default function Header() {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const { themeMode, setThemeMode } = useThemeStore();
    const { openTab } = useTabStore();
    const { hasPermission, isAdmin } = usePermission();
    const { data: settingsData } = useSettings();
    const settings = settingsData?.data;

    const canViewStock = isAdmin || hasPermission('inventory.view');
    const { data: lowStockData } = useLowStockAlertCount({
        enabled: Boolean(canViewStock),
        refetchInterval: 60000,
    });
    const lowStockCount = lowStockData?.total || 0;

    const handleLowStockClick = () => {
        openTab({
            path: '/stock?lowStock=true',
            title: 'Stock Overview',
            iconName: 'inventory',
            closable: true
        });
        navigate('/stock?lowStock=true');
    };

    const [showThemeMenu, setShowThemeMenu] = useState(false);
    const themeMenuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (themeMenuRef.current && !themeMenuRef.current.contains(e.target)) {
                setShowThemeMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            await authApi.logout();
        } catch (err) {
            // Even if backend fails, log out locally
        }
        logout();
        toast.success('Logged out successfully');
        navigate('/login');
    };

    const roleLabel = {
        admin: 'Administrator',
        manager: 'Manager',
        accountant: 'Accountant',
        sales_manager: 'Sales Manager',
        sales_rep: 'Sales Rep',
        warehouse_staff: 'Warehouse Staff',
        production_staff: 'Production Staff',
        staff: 'Staff',
    }[user?.role] || 'User';

    const isDark = themeMode === THEME_MODES.DARK;
    const isSoft = themeMode === THEME_MODES.SOFT;

    const headerBg = {
        [THEME_MODES.SOFT]: 'bg-[#F8FAFC] border-b border-slate-300',
        [THEME_MODES.PURE]: 'bg-white border-b border-gray-200',
        [THEME_MODES.DARK]: 'bg-[#0B192C] border-b border-slate-800 text-white',
    }[themeMode] || 'bg-[#F8FAFC] border-b border-slate-300';

    return (
        <header className={`no-print h-14 sm:h-16 ${headerBg} flex items-center justify-between px-3 sm:px-6 flex-shrink-0 transition-colors duration-200`}>
            {/* Left section: Brand & Navigation */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                {/* Brand Logo & Name */}
                <div 
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2.5 cursor-pointer select-none group"
                    title="Go to App Hub"
                >
                    <img
                        src={settings?.companyLogo || logo}
                        className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-white p-0.5 shadow-2xs group-hover:scale-105 transition-transform"
                        alt="Logo"
                    />
                    <div className="hidden sm:block">
                        <h2 className="font-bold text-sm text-slate-900 dark:text-white leading-tight truncate max-w-[150px]">
                            {settings?.companyName || 'GLX Industries'}
                        </h2>
                        <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                            ERP System
                        </p>
                    </div>
                </div>
            </div>

            {/* Right section: Theme, Notifications, Profile, Logout */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
                {/* Low Stock Alert Badge — ONLY shown when low stock products exist */}
                {lowStockCount > 0 && (
                    <button
                        onClick={handleLowStockClick}
                        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border shadow-2xs ${
                            isDark
                                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25 ring-1 ring-amber-500/30'
                                : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100 ring-1 ring-amber-400/30'
                        }`}
                        title={`${lowStockCount} product(s) below reorder level. Click to open Stock Overview.`}
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                        <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
                        <span className="hidden sm:inline">Low Stock:</span>
                        <span className="px-1.5 py-0.2 rounded-md bg-amber-500/20 dark:bg-amber-400/20 text-amber-800 dark:text-amber-200 font-bold text-[11px]">
                            {lowStockCount}
                        </span>
                    </button>
                )}

                {/* Theme / Background Tone Selector */}
                <div className="relative" ref={themeMenuRef}>
                    <button
                        onClick={() => setShowThemeMenu((prev) => !prev)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition shadow-2xs cursor-pointer ${
                            isDark
                                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                                : isSoft
                                    ? 'bg-slate-200/80 hover:bg-slate-300/80 border-slate-300 text-slate-800'
                                    : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700'
                        }`}
                        title="Change Background Tone"
                    >
                        <Palette size={14} className={isDark ? "text-sky-400" : "text-slate-600"} />
                        <span className="hidden sm:inline">
                            {themeMode === THEME_MODES.SOFT ? 'Soft' : (themeMode === THEME_MODES.PURE ? 'White' : 'Dark')}
                        </span>
                    </button>

                    {showThemeMenu && (
                        <div className={`absolute right-0 mt-1.5 w-48 border rounded-xl shadow-xl p-1.5 z-50 animate-in fade-in-50 zoom-in-95 duration-100 ${
                            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                        }`}>
                            <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Background Tone
                            </p>
                            <button
                                type="button"
                                onClick={() => { setThemeMode(THEME_MODES.SOFT); setShowThemeMenu(false); toast.success('Soft Slate tone activated (Eye-comfort)'); }}
                                className={`w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg transition ${
                                    themeMode === THEME_MODES.SOFT
                                        ? 'bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-sky-400 font-bold'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                <span className="flex items-center gap-2">Soft Slate</span>
                                {themeMode === THEME_MODES.SOFT && <Check size={14} className="text-blue-600 dark:text-sky-400" />}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setThemeMode(THEME_MODES.PURE); setShowThemeMenu(false); toast.success('Pure White tone activated'); }}
                                className={`w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg transition ${
                                    themeMode === THEME_MODES.PURE
                                        ? 'bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-sky-400 font-bold'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                <span className="flex items-center gap-2">Crisp White</span>
                                {themeMode === THEME_MODES.PURE && <Check size={14} className="text-blue-600 dark:text-sky-400" />}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setThemeMode(THEME_MODES.DARK); setShowThemeMenu(false); toast.success('Classic Dark tone activated'); }}
                                className={`w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg transition ${
                                    themeMode === THEME_MODES.DARK
                                        ? 'bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-sky-400 font-bold'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                <span className="flex items-center gap-2">Classic Dark</span>
                                {themeMode === THEME_MODES.DARK && <Check size={14} className="text-blue-600 dark:text-sky-400" />}
                            </button>
                        </div>
                    )}
                </div>

                <NotificationDropdown />

                {/* Avatar + role — hidden on mobile */}
                <div 
                    onClick={() => navigate('/profile')}
                    className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-slate-300 transition"
                    title="My Profile"
                >
                    <div className="w-7 h-7 bg-primary-100 dark:bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0 text-primary-600 dark:text-sky-400 font-bold text-xs">
                        {(user?.fullName || user?.firstName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="text-sm hidden md:block">
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-100 leading-tight">
                            {user?.fullName === 'New Admin' ? 'Admin Panel' : (user?.fullName === 'Admin User' ? roleLabel : user?.fullName)}
                        </p>
                        <p className="text-[10px] text-slate-400 capitalize leading-tight">{roleLabel}</p>
                    </div>
                </div>

                {/* Mobile: icon-only avatar button */}
                <button
                    onClick={() => navigate('/profile')}
                    className="sm:hidden w-8 h-8 bg-primary-100 dark:bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary-600 dark:text-sky-400"
                    aria-label="My profile"
                >
                    {(user?.fullName || user?.firstName || 'U').charAt(0).toUpperCase()}
                </button>

                {/* Logout — text on sm+, icon-only on mobile */}
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition border border-rose-200/80 shadow-2xs min-h-[34px] cursor-pointer"
                    title="Log out of system"
                >
                    <LogOut size={15} />
                    <span className="hidden sm:inline">Logout</span>
                </button>
            </div>
        </header>
    );
}