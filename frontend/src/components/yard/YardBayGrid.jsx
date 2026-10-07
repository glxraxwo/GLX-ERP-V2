import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, MapPin, User, ArrowUpRight, CheckCircle2, Clock, Wrench } from 'lucide-react';
import Badge from '../ui/Badge';

export default function YardBayGrid({ projects = [] }) {
    const navigate = useNavigate();

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(n || 0);

    // Default 12 standard fabrication bays in the yard
    const totalBays = 12;
    const activeProjects = projects.filter(p => p.status === 'active');

    // Map projects into bays by their yard property or sequential index
    const baySlots = Array.from({ length: totalBays }, (_, i) => {
        const bayNum = String(i + 1).padStart(2, '0');
        const bayLabel = `BAY ${bayNum}`;
        const assignedProject = activeProjects.find(p => (p.yard || '').toUpperCase().includes(`BAY ${bayNum}`) || (p.yard || '').toUpperCase().includes(`BAY-${bayNum}`)) || activeProjects[i] || null;

        return {
            bayNumber: bayNum,
            bayLabel,
            project: assignedProject
        };
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <Truck size={18} className="text-blue-600 dark:text-blue-400" />
                        Yard Manufacturing Bays (වාහන නිෂ්පාදන අංගනය - කොටු සටහන)
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Live visual floor plan of active vehicle fabrication bays, body progress, and slot occupancy</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> <span className="text-gray-700 dark:text-slate-300">Occupied ({activeProjects.length})</span></div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700"></span> <span className="text-gray-700 dark:text-slate-300">Available ({Math.max(0, totalBays - activeProjects.length)})</span></div>
                </div>
            </div>

            {/* Visual Grid of Bays */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {baySlots.map((slot) => {
                    const p = slot.project;
                    const isOccupied = !!p;

                    return (
                        <div
                            key={slot.bayNumber}
                            onClick={() => p && navigate(`/crm/projects/${p._id}`)}
                            className={`rounded-2xl border transition-all duration-200 p-4 relative flex flex-col justify-between min-h-[220px] ${
                                isOccupied
                                    ? 'bg-white dark:bg-[#16253b] border-blue-200 dark:border-slate-700/80 shadow-sm hover:shadow-md hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer group'
                                    : 'bg-slate-50/70 dark:bg-slate-800/40 border-dashed border-slate-300 dark:border-slate-700 text-gray-400 dark:text-slate-500'
                            }`}
                        >
                            {/* Bay Header */}
                            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700/60 pb-2.5">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded-lg text-xs font-black tracking-wider ${
                                        isOccupied ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200 border border-blue-200/60 dark:border-blue-700/70' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                    }`}>
                                        {slot.bayLabel}
                                    </span>
                                    {isOccupied && (
                                        <span className="text-[10px] font-mono font-bold text-gray-400 dark:text-slate-500">
                                            {p.projectNumber}
                                        </span>
                                    )}
                                </div>
                                {isOccupied ? (
                                    <Badge variant="info">IN WORK</Badge>
                                ) : (
                                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">VACANT</span>
                                )}
                            </div>

                            {/* Bay Body Content */}
                            {isOccupied ? (
                                <div className="py-3 space-y-2 flex-1">
                                    <div className="flex items-start gap-2">
                                        <div className="p-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg shrink-0 mt-0.5 group-hover:bg-blue-600 group-hover:text-white transition">
                                            <Truck size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate" title={p.name}>
                                                {p.name}
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                                                {p.customer?.displayName || 'Customer'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="space-y-1 pt-1">
                                        <div className="flex justify-between text-[11px] font-bold">
                                            <span className="text-gray-500 dark:text-slate-400">Fabrication Progress</span>
                                            <span className="text-blue-700 dark:text-blue-400">{p.progress || 0}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                            <div
                                                className={`h-2 rounded-full transition-all duration-500 ${
                                                    (p.progress || 0) >= 80 ? 'bg-emerald-500' : (p.progress || 0) >= 40 ? 'bg-blue-600' : 'bg-amber-500'
                                                }`}
                                                style={{ width: `${Math.max(5, p.progress || 0)}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400 pt-1">
                                        <span className="flex items-center gap-1 truncate max-w-[130px]" title={p.yard || slot.bayLabel}>
                                            <MapPin size={12} className="text-slate-400 shrink-0" />
                                            <span className="truncate">{p.yard || slot.bayLabel}</span>
                                        </span>
                                        <span className="font-mono font-bold text-slate-800 dark:text-white">
                                            {fmt(p.quotedPrice)}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600 mb-2">
                                        <Wrench size={18} />
                                    </div>
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Empty Bay Slot</p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Ready for new vehicle</p>
                                </div>
                            )}

                            {/* Bay Footer */}
                            {isOccupied && (
                                <div className="border-t border-gray-100 dark:border-slate-700/60 pt-2 flex items-center justify-between text-[11px]">
                                    <span className="text-gray-400 dark:text-slate-500 font-medium flex items-center gap-1">
                                        <User size={12} /> {p.assignedEmployees?.length || 0} Technician(s)
                                    </span>
                                    <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-0.5 group-hover:underline">
                                        Open Job <ArrowUpRight size={12} />
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
