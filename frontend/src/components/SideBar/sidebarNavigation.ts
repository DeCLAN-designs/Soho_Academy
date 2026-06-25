export type NavigationItem = {
    id: string
    label: string
    children?: NavigationItem[]
}

const DEFAULT_NAVIGATION_ITEMS: NavigationItem[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'profile', label: 'Profile' },
    { id: 'settings', label: 'Settings' },
]

const ROLE_NAVIGATION_ITEMS: Record<string, NavigationItem[]> = {
    Parent: [
        { id: 'overview', label: 'Overview' },
        { id: 'children', label: 'Children' },
        { id: 'trips', label: 'Trips' },
        { id: 'requests', label: 'Request' },
        { id: 'alerts', label: 'Alerts' },
    ],
    Driver: [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'attendance', label: 'Attendance' },
        { id: 'fuelMaintenance', label: 'Fuel & Maintenance' },
        { id: 'complianceDocuments', label: 'Compliance Documents' },
        { id: 'incidents', label: 'Incidents & Accidents' },
        { id: 'compliantsReports', label: 'Compliants & Reports' },
        { id: 'myActivity', label: 'My Activity' },
        { id: 'profile', label: 'Profile' },
    ],
    'Bus Assistant': [
        { id: 'overview', label: 'Dashboard' },
        { id: 'attendance', label: 'Attendance' },
        { id: 'fuelMaintenance', label: 'Fuel & Maintenance' },
        { id: 'accidents-reports', label: 'Accidents and Reports' },
        { id: 'complaints-incidents', label: 'Complaints and Incidents' },
        { id: 'profile', label: 'Profile' },
    ],
    'Transport Manager': [
        { id: 'dashboard', label: 'Dashboard' },
        {
            id: 'fleet',
            label: 'Fleet',
            children: [
                { id: 'vehicles', label: 'Vehicles' },
                { id: 'fuel-management', label: 'Fuel Management' },
                { id: 'maintenance', label: 'Maintenance' },
                { id: 'vehicle-documents', label: 'Vehicle Documents' },
            ],
        },
        {
            id: 'routes',
            label: 'Routes',
            children: [
                { id: 'route-planning', label: 'Route Planning' },
                { id: 'stops', label: 'Stops' },
                { id: 'route-monitoring', label: 'Route Monitoring' },
                { id: 'optimization', label: 'Optimization' },
            ],
        },
        {
            id: 'students',
            label: 'Students',
            children: [
                { id: 'assignments', label: 'Assignments' },
                { id: 'attendance', label: 'Attendance' },
                { id: 'change-requests', label: 'Change Requests' },
            ],
        },
        {
            id: 'staff',
            label: 'Staff',
            children: [
                { id: 'drivers', label: 'Drivers' },
                { id: 'bus-assistants', label: 'Bus Assistants' },
                { id: 'scheduling', label: 'Scheduling' },
            ],
        },
        {
            id: 'safety-incidents',
            label: 'Safety & Incidents',
            children: [
                { id: 'incident-reports', label: 'Incident Reports' },
                { id: 'emergency-management', label: 'Emergency Management' },
                { id: 'safety-audits', label: 'Safety Audits' },
                { id: 'violations', label: 'Violations' },
            ],
        },
        {
            id: 'requests',
            label: 'Requests',
            children: [
                { id: 'fuel-requests', label: 'Fuel Requests' },
                { id: 'maintenance-requests', label: 'Maintenance Requests' },
                { id: 'student-requests', label: 'Student Requests' },
                { id: 'route-requests', label: 'Route Requests' },
            ],
        },
        {
            id: 'communication',
            label: 'Communication',
            children: [
                { id: 'announcements', label: 'Announcements' },
                { id: 'parent-notifications', label: 'Parent Notifications' },
                { id: 'internal-messaging', label: 'Internal Messaging' },
            ],
        },
        {
            id: 'reports',
            label: 'Reports',
            children: [
                { id: 'operational-reports', label: 'Operational Reports' },
                { id: 'financial-reports', label: 'Financial Reports' },
                { id: 'staff-reports', label: 'Staff Reports' },
                { id: 'compliance-reports', label: 'Compliance Reports' },
            ],
        },
        { id: 'audit-logs', label: 'Audit Logs' },
        { id: 'settings', label: 'Settings' },
    ],
    'School Admin': [
        { id: 'overview', label: 'Overview' },
        { id: 'admissions', label: 'Admissions' },
        { id: 'contactChanges', label: 'Contact Changes' },
        { id: 'withdrawals', label: 'Withdrawals' },
        { id: 'masterData', label: 'Master Data' },
    ],
}

export const getSidebarNavigationItems = (role: string): NavigationItem[] => {
    return ROLE_NAVIGATION_ITEMS[role] || DEFAULT_NAVIGATION_ITEMS
}

export const flattenSidebarNavigationItems = (items: NavigationItem[]): NavigationItem[] => {
    return items.flatMap((item) => [item, ...(item.children ? flattenSidebarNavigationItems(item.children) : [])])
}

export const getSidebarNavigationFlatItems = (role: string): NavigationItem[] => {
    return flattenSidebarNavigationItems(getSidebarNavigationItems(role))
}
