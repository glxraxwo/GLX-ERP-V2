import { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Eye, DollarSign, Calendar, Lock, AlertTriangle } from 'lucide-react';
import api from '../../api/axios';

export default function EmployeeEarningsView() {
  const [profile, setProfile] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBlurred, setIsBlurred] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const fetchEarningsData = async () => {
      setLoading(true);
      try {
        const [profileRes, attRes] = await Promise.all([
          api.get('/hr/employees/me'),
          api.get('/hr/attendance')
        ]);

        if (profileRes.data.success) {
          setProfile(profileRes.data.data);
        }

        if (attRes.data.success) {
          const records = attRes.data.data || [];
          const totalOTAmount = records.reduce((sum, r) => sum + (r.overtimeAmount || 0), 0);
          const totalLatePenalty = records.reduce((sum, r) => sum + (r.latePenaltyAmount || 0), 0);
          const totalEarlyPenalty = records.reduce((sum, r) => sum + (r.earlyLeavePenaltyAmount || 0), 0);
          const totalWorkedMins = records.reduce((sum, r) => sum + (r.totalWorkedMinutes || 0), 0);

          setAttendanceSummary({
            totalOTAmount,
            totalLatePenalty,
            totalEarlyPenalty,
            totalWorkedHours: (totalWorkedMins / 60).toFixed(1),
            daysPresent: records.filter(r => r.status === 'present').length,
          });
        }
      } catch (err) {
        console.error('Error fetching earnings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEarningsData();
  }, []);

  // Anti-Screenshot & Copy Protection logic
  useEffect(() => {
    const handleBlur = () => {
      setIsBlurred(true);
    };

    const handleFocus = () => {
      setIsBlurred(false);
    };

    const handleKeyDown = (e) => {
      // Block PrintScreen (Key 44), Ctrl+P, Ctrl+S, Ctrl+C, Cmd+P, Cmd+S
      if (
        e.key === 'PrintScreen' ||
        (e.ctrlKey && (e.key === 'p' || e.key === 'P' || e.key === 's' || e.key === 'S' || e.key === 'c' || e.key === 'C')) ||
        (e.metaKey && (e.key === 'p' || e.key === 'P' || e.key === 's' || e.key === 'S' || e.key === 'c' || e.key === 'C'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        setIsBlurred(true);
        alert('Security Warning: Screenshot, Print, and Copy actions are disabled for employee earnings security.');
        setTimeout(() => setIsBlurred(false), 2000);
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading secure earnings profile...</div>;
  }

  if (!profile) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-xl border">
        Employee profile not found.
      </div>
    );
  }

  const basicSalary = profile.basicSalary || 0;
  const otEarnings = attendanceSummary?.totalOTAmount || 0;
  const totalDeductions = (attendanceSummary?.totalLatePenalty || 0) + (attendanceSummary?.totalEarlyPenalty || 0);
  const netEarnings = basicSalary + otEarnings - totalDeductions;

  return (
    <div
      ref={containerRef}
      className={`select-none transition-all duration-300 relative ${isBlurred ? 'blur-md opacity-30 grayscale' : ''}`}
      style={{
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      {/* CSS Print Guard */}
      <style>{`
        @media print {
          body { display: none !important; }
        }
      `}</style>

      {/* Security Warning Notice */}
      <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 sm:p-4 rounded-xl mb-4 sm:mb-6 flex items-start gap-2.5 sm:gap-3">
        <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <span className="font-bold">Protected Employee Earnings View:</span> Paysheet downloading and screen capturing are strictly disabled. This statement is for digital viewing only.
        </div>
      </div>

      {/* Earnings Dashboard Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm sm:shadow-md relative overflow-hidden">
        {/* Dynamic Watermark Background */}
        <div className="absolute inset-0 pointer-events-none opacity-5 flex items-center justify-center rotate-[-25deg] select-none text-slate-900 font-extrabold text-sm sm:text-xl md:text-2xl lg:text-3xl tracking-wider uppercase text-center px-4 break-words">
          CONFIDENTIAL - {profile.employeeCode} - {profile.fullName}
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4 sm:mb-6">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 truncate">{profile.fullName}</h2>
            <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2">
              <span>Code: <span className="font-medium text-slate-700">{profile.employeeCode}</span></span>
              <span>|</span>
              <span>Dept: <span className="font-medium text-slate-700">{profile.departmentId?.name || 'Staff'}</span></span>
            </p>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full flex items-center gap-1.5 whitespace-nowrap">
            <DollarSign className="w-3.5 h-3.5" /> Active Period Earnings
          </span>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="p-3.5 sm:p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs text-slate-500 font-medium">Basic Wage / Salary</span>
            <p className="text-lg sm:text-xl font-bold text-slate-800 mt-1 break-all">
              LKR {basicSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="p-3.5 sm:p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <span className="text-xs text-emerald-700 font-medium">Policy OT Earnings</span>
            <p className="text-lg sm:text-xl font-bold text-emerald-600 mt-1 break-all">
              + LKR {otEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="p-3.5 sm:p-4 bg-rose-50 rounded-xl border border-rose-100">
            <span className="text-xs text-rose-700 font-medium">Policy Penalties & Cuts</span>
            <p className="text-lg sm:text-xl font-bold text-rose-600 mt-1 break-all">
              - LKR {totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="p-3.5 sm:p-4 bg-indigo-50 rounded-xl border border-indigo-100">
            <span className="text-xs text-indigo-700 font-medium">Net Estimated Earnings</span>
            <p className="text-lg sm:text-xl font-bold text-indigo-600 mt-1 break-all">
              LKR {netEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Detailed breakdown */}
        <div className="space-y-2.5 sm:space-y-3 bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-100 text-xs">
          <h4 className="font-semibold text-slate-700 uppercase tracking-wider mb-2">Attendance & Time Breakdown</h4>
          <div className="flex items-center justify-between gap-2 py-1 border-b border-slate-200">
            <span className="text-slate-500">Days Present</span>
            <span className="font-medium text-slate-700">{attendanceSummary?.daysPresent || 0} Days</span>
          </div>
          <div className="flex items-center justify-between gap-2 py-1 border-b border-slate-200">
            <span className="text-slate-500">Total Worked Hours</span>
            <span className="font-medium text-slate-700">{attendanceSummary?.totalWorkedHours || 0} Hours</span>
          </div>
          <div className="flex items-center justify-between gap-2 py-1 border-b border-slate-200">
            <span className="text-slate-500">Late Arrival Penalties</span>
            <span className="font-medium text-rose-600 text-right">LKR {attendanceSummary?.totalLatePenalty?.toLocaleString() || 0}</span>
          </div>
          <div className="flex items-center justify-between gap-2 py-1">
            <span className="text-slate-500">Early Leave Penalties</span>
            <span className="font-medium text-rose-600 text-right">LKR {attendanceSummary?.totalEarlyPenalty?.toLocaleString() || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
