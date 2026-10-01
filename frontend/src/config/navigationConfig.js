import {
    LayoutDashboard, BarChart3, Download,
    Package, Barcode, FolderTree, Boxes, Warehouse, Workflow,
    Truck, ShoppingBag, PackageCheck, Receipt,
    Wallet, DollarSign, TrendingUp, Calculator,
    UserCircle, FileSpreadsheet, Briefcase, ShoppingCart, RotateCcw, AlertTriangle,
    Factory, Layers,
    Users, Calendar, Plane, Clock, BadgeCheck, Building2, UserCheck, Award,
    ShieldCheck, Upload, Mail, Settings, LayoutGrid, Wrench
} from 'lucide-react';

export const NAVIGATION_CATEGORIES = [
    {
        id: 'overview',
        label: 'Dashboard & Overview',
        shortLabel: 'Dashboard',
        badge: 'Executive',
        color: 'from-blue-600 to-indigo-600',
        textColor: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        items: [
            {
                title: 'Management Dashboard',
                path: '/dashboard',
                icon: LayoutDashboard,
                description: 'Executive KPIs, revenue trends, live order alerts & operational summary',
                permission: 'dashboard.view',
                category: 'overview'
            },
            {
                title: 'Export Centre',
                path: '/export-centre',
                icon: Download,
                description: 'Bulk CSV & Excel data exports across all company ledgers',
                permission: 'dashboard.view',
                category: 'overview'
            }
        ]
    },
    {
        id: 'reports',
        label: 'Reports & Analytics',
        shortLabel: 'Reports',
        badge: 'Reports',
        color: 'from-indigo-600 to-violet-600',
        textColor: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-200',
        items: [
            {
                title: 'Reports Hub',
                path: '/reports',
                icon: BarChart3,
                description: 'Comprehensive business reports: Sales, Inventory valuations, Financial balance & HR',
                anyPermission: ['reports.sales', 'reports.financial', 'reports.inventory', 'reports.hr', 'reports.production', 'dashboard.view'],
                category: 'reports'
            }
        ]
    },
    {
        id: 'inventory',
        label: 'Inventory & Stock',
        shortLabel: 'Inventory',
        badge: 'Warehouse',
        color: 'from-emerald-600 to-teal-600',
        textColor: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        items: [
            {
                title: 'Products Master',
                path: '/products',
                icon: Package,
                description: 'Product catalog, pricing, SKUs, barcode mappings and re-order levels',
                category: 'inventory'
            },
            {
                title: 'Stock Overview',
                path: '/stock',
                icon: Boxes,
                description: 'Real-time multi-location warehouse inventory balance & valuations',
                permission: 'inventory.view',
                category: 'inventory'
            },
            {
                title: 'Barcode Generator',
                path: '/barcode-generator',
                icon: Barcode,
                description: 'Generate and print thermal / standard Code128 barcodes for products',
                category: 'inventory'
            },
            {
                title: 'Categories',
                path: '/categories',
                icon: FolderTree,
                description: 'Organize raw materials and finished bodies into structured categories',
                category: 'inventory'
            },
            {
                title: 'Brands',
                path: '/brands',
                icon: Award,
                description: 'Manage component suppliers, brands and manufacturer identities',
                category: 'inventory'
            }
        ]
    },
    {
        id: 'procurement',
        label: 'Procurement & Supply',
        shortLabel: 'Procurement',
        badge: 'Suppliers',
        color: 'from-amber-600 to-orange-600',
        textColor: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        items: [
            {
                title: 'Suppliers Directory',
                path: '/suppliers',
                icon: Truck,
                description: 'Vendors, credit agreements, contact details and payable ledger history',
                permission: 'suppliers.view',
                category: 'procurement'
            },
            {
                title: 'Purchase Orders (PO)',
                path: '/purchase-orders',
                icon: ShoppingBag,
                description: 'Create, dispatch and approve material purchase orders with suppliers',
                permission: 'purchasing.view',
                category: 'procurement'
            },
            {
                title: 'Goods Received Notes (GRN)',
                path: '/grns',
                icon: PackageCheck,
                description: 'Log received materials at factory gate with quality inspection check',
                permission: 'grn.manage',
                category: 'procurement'
            },
            {
                title: 'Supplier Bills',
                path: '/bills',
                icon: Receipt,
                description: 'Match supplier invoices against GRNs and record payable obligations',
                permission: 'bills.view',
                category: 'procurement'
            }
        ]
    },
    {
        id: 'finance',
        label: 'Finance & Accounts',
        shortLabel: 'Finance',
        badge: 'Cash & Ledgers',
        color: 'from-violet-600 to-purple-600',
        textColor: 'text-violet-600',
        bgColor: 'bg-violet-50',
        borderColor: 'border-violet-200',
        items: [
            {
                title: 'Invoices, Quotations & Estimates',
                path: '/invoices',
                icon: Receipt,
                description: 'Billing, tax invoices, quotations, vehicle estimates, and customer balance tracking',
                permission: 'invoices.view',
                category: 'finance'
            },
            {
                title: 'Receipts & Payments',
                path: '/payments',
                icon: Wallet,
                description: 'Customer payment receipts, supplier voucher payouts & payment receipts',
                permission: 'payments.view',
                category: 'finance'
            },
            {
                title: 'Income & Expenses',
                path: '/finance/expenses',
                icon: DollarSign,
                description: 'Company operating expense accounts, utilities and other direct expenses',
                permission: 'payments.view',
                category: 'finance'
            }
        ]
    },
    {
        id: 'sales',
        label: 'Sales & CRM',
        shortLabel: 'Sales',
        badge: 'Clients & Orders',
        color: 'from-sky-600 to-cyan-600',
        textColor: 'text-sky-600',
        bgColor: 'bg-sky-50',
        borderColor: 'border-sky-200',
        items: [
            {
                title: 'Customers Master',
                path: '/customers',
                icon: UserCircle,
                description: 'Customer profiles, contact persons, credit limits and outstanding receivables',
                permission: 'customers.view',
                category: 'sales'
            },

            {
                title: 'Yard Projects (CRM)',
                path: '/crm/projects',
                icon: Briefcase,
                description: 'Custom lorry body fabrication project stages, lead times and notes',
                permission: 'sales.view',
                category: 'sales'
            },
            {
                title: 'Sales Orders',
                path: '/sales-orders',
                icon: ShoppingCart,
                description: 'Official customer orders, delivery scheduling and payment fulfillment',
                permission: 'sales.view',
                category: 'sales'
            },
            {
                title: 'POS Billing Terminal',
                path: '/pos',
                icon: Calculator,
                description: 'Rapid spare parts counter sales, fast checkout and instant cash invoicing',
                permission: 'pos.access',
                category: 'sales'
            },
            {
                title: 'Supplier Returns',
                path: '/supplier-returns',
                icon: RotateCcw,
                description: 'Return substandard raw materials or wrong goods back to suppliers',
                permission: 'supplier_returns.view',
                category: 'sales'
            },
            {
                title: 'Damaged Goods Ledger',
                path: '/damages',
                icon: AlertTriangle,
                description: 'Record workshop fabrication defects, transit damage and scrap items',
                permission: 'damages.view',
                category: 'sales'
            }
        ]
    },
    {
        id: 'hr',
        label: 'Human Resources (HR)',
        shortLabel: 'HR',
        badge: 'Staff & Payroll',
        color: 'from-indigo-600 to-blue-600',
        textColor: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-200',
        items: [
            {
                title: 'Employees Master',
                path: '/employees',
                icon: Users,
                description: 'Personnel directory, NIC, bank accounts, appointments and contact information',
                anyPermission: ['hr.employees.view', 'dashboard.view'],
                category: 'hr'
            },
            {
                title: 'Daily Attendance',
                path: '/attendance',
                icon: Clock,
                description: 'Time attendance logs, in/out timestamps, overtime hours & late arrivals',
                permission: 'hr.attendance.view',
                category: 'hr'
            },
            {
                title: 'Leave Management',
                path: '/leaves',
                icon: Plane,
                description: 'Employee leave requests, entitlement records and manager approvals',
                permission: 'hr.leaves.view',
                category: 'hr'
            },
            {
                title: 'Attendance Policies',
                path: '/attendance-policies',
                icon: Clock,
                description: 'Overtime rate multipliers, late penalty rules and grace period policies',
                permission: 'hr.attendance.view',
                category: 'hr'
            },
            {
                title: 'Monthly Payroll',
                path: '/payroll',
                icon: DollarSign,
                description: 'Generate monthly payslips, calculate allowances, deductions and bank sheets',
                permission: 'hr.payroll.view',
                category: 'hr'
            },
            {
                title: 'Daily Wages (දිනපතා පඩි)',
                path: '/hr/daily-payroll',
                icon: Calendar,
                description: 'Daily casual worker wage settlement, voucher generation and daily payouts',
                permission: 'hr.payroll.view',
                category: 'hr'
            },
            {
                title: 'EPF / ETF Statements',
                path: '/hr/epf-etf',
                icon: Calculator,
                description: 'Monthly statutory 8% / 12% EPF and 3% ETF government submission sheets',
                permission: 'hr.payroll.view',
                category: 'hr'
            },
            {
                title: 'Advance Approvals',
                path: '/admin/advance-approvals',
                icon: BadgeCheck,
                description: 'Review and approve salary advances requested by staff members',
                permission: 'hr.employees.manage',
                excludeRoles: ['employee'],
                category: 'hr'
            },
            {
                title: 'Departments',
                path: '/departments',
                icon: Building2,
                description: 'Organizational business units (Fabrication, Engineering, Admin, Accounts)',
                permission: 'hr.employees.view',
                category: 'hr'
            },
            {
                title: 'Designations',
                path: '/designations',
                icon: Award,
                description: 'Job titles, grade hierarchies and specific responsibilities',
                permission: 'hr.employees.view',
                category: 'hr'
            },
            {
                title: 'Shifts & Rosters',
                path: '/shifts',
                icon: Clock,
                description: 'Day shifts, night shifts, weekend rosters and standard working hours',
                permission: 'hr.employees.view',
                category: 'hr'
            },
            {
                title: 'Leave Structures',
                path: '/leave-structures',
                icon: Calendar,
                description: 'Configure annual, medical, and casual leave quotas per designation',
                permission: 'hr.leaves.view',
                category: 'hr'
            },
            {
                title: 'Salary Structures',
                path: '/salary-structures',
                icon: Calculator,
                description: 'Basic salary templates, fixed allowances, travel & attendance incentives',
                permission: 'hr.salary.view',
                category: 'hr'
            },
            {
                title: 'My Salary Advances',
                path: '/my-advances',
                icon: Wallet,
                description: 'Self-service: View personal advance ledger, deductions and status',
                category: 'hr'
            },
            {
                title: 'Request Salary Advance',
                path: '/request-advance',
                icon: BadgeCheck,
                description: 'Self-service: Submit an urgent salary advance request for review',
                category: 'hr'
            }
        ]
    },
    {
        id: 'admin',
        label: 'System Administration',
        shortLabel: 'Admin',
        badge: 'Security & Setup',
        color: 'from-slate-700 to-slate-900',
        textColor: 'text-slate-700',
        bgColor: 'bg-slate-100',
        borderColor: 'border-slate-300',
        adminOnly: true,
        items: [
            {
                title: 'Users & Passwords',
                path: '/users',
                icon: Users,
                description: 'Create user accounts, set credentials, activate/deactivate accounts',
                permission: 'admin.users.view',
                category: 'admin'
            },
            {
                title: 'Roles & Permissions',
                path: '/roles',
                icon: ShieldCheck,
                description: 'Define granular permissions, access levels and security roles',
                permission: 'admin.roles.view',
                category: 'admin'
            },
            {
                title: 'Excel / CSV Data Import',
                path: '/import',
                icon: Upload,
                description: 'Bulk import products, opening balances, customers and supplier lists',
                permission: 'admin.settings',
                category: 'admin'
            },
            {
                title: 'System Audit Logs',
                path: '/audit-logs',
                icon: Clock,
                description: 'Comprehensive activity history, record alterations and logins',
                permission: 'view_audit_logs',
                category: 'admin'
            },
            {
                title: 'SMS Delivery Logs',
                path: '/audit-logs/sms',
                icon: Mail,
                description: 'Automated SMS delivery logs for invoices, receipts and payslips',
                permission: 'view_audit_logs',
                category: 'admin'
            },
            {
                title: 'User Profile & Security',
                path: '/profile',
                icon: UserCheck,
                description: 'Change profile information, update personal password and preferences',
                category: 'admin'
            },
            {
                title: 'Company Settings',
                path: '/settings',
                icon: Settings,
                description: 'Business name, logo, invoice prefixes, tax rules and SMS gateways',
                permission: 'admin.settings',
                category: 'admin'
            }
        ]
    }
];

// Helper to look up an item by path
export function findNavigationItem(path) {
    if (!path) return null;
    const cleanPath = path.split('?')[0].split('#')[0];
    
    // Check direct matches first
    for (const cat of NAVIGATION_CATEGORIES) {
        for (const item of cat.items) {
            if (item.path === cleanPath) return item;
        }
    }
    
    // Check prefix matches for subpages (e.g. /invoices/new -> Invoices)
    for (const cat of NAVIGATION_CATEGORIES) {
        for (const item of cat.items) {
            if (item.path !== '/' && cleanPath.startsWith(item.path)) return item;
        }
    }
    
    return null;
}
