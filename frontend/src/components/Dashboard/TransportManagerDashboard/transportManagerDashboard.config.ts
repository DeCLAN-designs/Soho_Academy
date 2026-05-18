import type { DashboardRoleConfig } from '../dashboard.types'

const transportManagerNavigation: DashboardRoleConfig['navigation'] = [
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
]

export const transportManagerDashboardConfig: DashboardRoleConfig = {
    title: 'Transport Manager Dashboard',
    subtitle: 'Oversee vehicles, personnel, and route operations.',
    quickActions: ['Assign Route', 'Fleet Status', 'Generate Report'],
    navigation: transportManagerNavigation,
    sections: {
        dashboard: {
            heading: 'Operations Overview',
            description: 'Get a high-level view of transport activity.',
            cards: ['Active routes today', 'Late routes count', 'Open incident count'],
        },
        fleet: {
            heading: 'Fleet Management',
            description: 'Track vehicles, fuel, maintenance, and compliance documents.',
            cards: ['Vehicle availability', 'Fuel usage summary', 'Maintenance and document alerts'],
        },
        vehicles: {
            heading: 'Vehicles',
            description: 'Manage vehicle records, assignments, and availability.',
            cards: ['Active vehicles', 'Vehicle assignment status', 'Inspection readiness'],
        },
        'fuel-management': {
            heading: 'Fuel Management',
            description: 'Monitor consumption, refueling history, and fuel budgets.',
            cards: ['Fuel consumption trends', 'Recent refueling logs', 'Fuel variance alerts'],
        },
        maintenance: {
            heading: 'Maintenance',
            description: 'Schedule repairs and track service requirements.',
            cards: ['Open maintenance jobs', 'Upcoming service dates', 'Repair cost summary'],
        },
        'vehicle-documents': {
            heading: 'Vehicle Documents',
            description: 'Keep insurance, inspection, and registration documents current.',
            cards: ['Expiring documents', 'Missing document records', 'Compliance status'],
        },
        routes: {
            heading: 'Routes',
            description: 'Plan, monitor, and optimize school transport routes.',
            cards: ['Active route map', 'Route coverage', 'Optimization opportunities'],
        },
        'route-planning': {
            heading: 'Route Planning',
            description: 'Build routes around students, stops, vehicles, and staff.',
            cards: ['Draft routes', 'Unassigned stops', 'Route capacity checks'],
        },
        stops: {
            heading: 'Stops',
            description: 'Manage pickup and drop-off points across route networks.',
            cards: ['Approved stops', 'Stop change requests', 'Stop safety notes'],
        },
        'route-monitoring': {
            heading: 'Route Monitoring',
            description: 'Track live route progress and operational exceptions.',
            cards: ['Routes in progress', 'Delayed arrivals', 'Missed stop alerts'],
        },
        optimization: {
            heading: 'Optimization',
            description: 'Review route efficiency and improvement opportunities.',
            cards: ['Distance reduction ideas', 'Load balancing', 'Time savings estimate'],
        },
        students: {
            heading: 'Students',
            description: 'Manage student transport assignments, attendance, and requests.',
            cards: ['Assigned students', 'Unassigned students', 'Open change requests'],
        },
        assignments: {
            heading: 'Assignments',
            description: 'Assign students to routes, stops, and vehicles.',
            cards: ['Route assignments', 'Pending assignments', 'Capacity conflicts'],
        },
        attendance: {
            heading: 'Attendance',
            description: 'Review student transport attendance and exceptions.',
            cards: ['Boarded students', 'Absent students', 'Attendance exceptions'],
        },
        'change-requests': {
            heading: 'Change Requests',
            description: 'Process student route, stop, and schedule change requests.',
            cards: ['New requests', 'Requests in review', 'Approved changes'],
        },
        staff: {
            heading: 'Staff Allocation',
            description: 'Manage drivers and bus assistants.',
            cards: ['Driver assignments', 'Bus assistant assignments', 'Attendance and leave'],
        },
        drivers: {
            heading: 'Drivers',
            description: 'Manage driver records, assignments, and compliance status.',
            cards: ['Available drivers', 'License expiry alerts', 'Driver route assignments'],
        },
        'bus-assistants': {
            heading: 'Bus Assistants',
            description: 'Coordinate bus assistant assignments and availability.',
            cards: ['Available assistants', 'Assistant route assignments', 'Coverage gaps'],
        },
        scheduling: {
            heading: 'Scheduling',
            description: 'Schedule transport staff for daily and weekly operations.',
            cards: ["Today's roster", 'Shift conflicts', 'Leave coverage'],
        },
        'safety-incidents': {
            heading: 'Safety & Incidents',
            description: 'Manage incidents, emergencies, safety checks, and violations.',
            cards: ['Open incidents', 'Emergency readiness', 'Safety action items'],
        },
        'incident-reports': {
            heading: 'Incident Reports',
            description: 'Review, document, and resolve transport incident reports.',
            cards: ['New incident reports', 'Under investigation', 'Resolved incidents'],
        },
        'emergency-management': {
            heading: 'Emergency Management',
            description: 'Coordinate emergency contacts, responses, and escalations.',
            cards: ['Active emergency plans', 'Emergency contacts', 'Response drills'],
        },
        'safety-audits': {
            heading: 'Safety Audits',
            description: 'Track safety inspections and audit findings.',
            cards: ['Scheduled audits', 'Failed checks', 'Corrective actions'],
        },
        violations: {
            heading: 'Violations',
            description: 'Track driver, vehicle, and route compliance violations.',
            cards: ['Open violations', 'Repeat issues', 'Resolution deadlines'],
        },
        requests: {
            heading: 'Requests',
            description: 'Review fuel, maintenance, student, and route requests.',
            cards: ['Pending requests', 'Approved requests', 'Rejected requests'],
        },
        'fuel-requests': {
            heading: 'Fuel Requests',
            description: 'Approve and monitor fuel request workflows.',
            cards: ['Fuel approvals pending', 'Recent approvals', 'Budget impact'],
        },
        'maintenance-requests': {
            heading: 'Maintenance Requests',
            description: 'Review and prioritize vehicle maintenance requests.',
            cards: ['New repair requests', 'Urgent requests', 'Assigned mechanics'],
        },
        'student-requests': {
            heading: 'Student Requests',
            description: 'Manage transport requests related to students and guardians.',
            cards: ['New student requests', 'Parent follow-ups', 'Approved student changes'],
        },
        'route-requests': {
            heading: 'Route Requests',
            description: 'Assess requested route changes, additions, and removals.',
            cards: ['Route change queue', 'Impact review', 'Approved route updates'],
        },
        communication: {
            heading: 'Communication',
            description: 'Coordinate announcements, parent updates, and internal messages.',
            cards: ['Pending announcements', 'Parent notification status', 'Unread internal messages'],
        },
        announcements: {
            heading: 'Announcements',
            description: 'Create and manage transport-wide announcements.',
            cards: ['Draft announcements', 'Scheduled announcements', 'Sent announcements'],
        },
        'parent-notifications': {
            heading: 'Parent Notifications',
            description: 'Send targeted updates to parents and guardians.',
            cards: ['Pending parent alerts', 'Delivery status', 'Failed notifications'],
        },
        'internal-messaging': {
            heading: 'Internal Messaging',
            description: 'Coordinate transport team communication.',
            cards: ['Unread messages', 'Team threads', 'Escalated conversations'],
        },
        reports: {
            heading: 'Reports Center',
            description: 'Review and export transport performance reports.',
            cards: ['Route performance trends', 'Incident frequency report', 'Monthly operations summary'],
        },
        'operational-reports': {
            heading: 'Operational Reports',
            description: 'Analyze route reliability, fleet availability, and incidents.',
            cards: ['Route performance trends', 'Fleet utilization', 'Incident frequency'],
        },
        'financial-reports': {
            heading: 'Financial Reports',
            description: 'Track fuel, maintenance, and operational transport costs.',
            cards: ['Fuel spend', 'Maintenance spend', 'Cost per route'],
        },
        'staff-reports': {
            heading: 'Staff Reports',
            description: 'Review driver and assistant attendance, workload, and performance.',
            cards: ['Staff attendance', 'Shift coverage', 'Performance notes'],
        },
        'compliance-reports': {
            heading: 'Compliance Reports',
            description: 'Export vehicle, staff, route, and safety compliance summaries.',
            cards: ['Document compliance', 'Audit results', 'Violation summary'],
        },
        'audit-logs': {
            heading: 'Audit Logs',
            description: 'Review transport manager activity and system changes.',
            cards: ['Recent activity', 'Changed records', 'Export audit trail'],
        },
        settings: {
            heading: 'Settings',
            description: 'Configure transport dashboard preferences and permissions.',
            cards: ['Transport preferences', 'Notification settings', 'Access controls'],
        },
    },
}
