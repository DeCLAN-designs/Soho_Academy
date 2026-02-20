import type { DashboardRoleConfig } from '../dashboard.types'

type TransportManagerDashboardProps = {
    activeSection: string
}

export const transportManagerDashboardConfig: DashboardRoleConfig = {
    title: 'Transport Manager Dashboard',
    subtitle: 'Oversee vehicles, personnel, and route operations.',
    quickActions: ['Assign Route', 'Fleet Status', 'Generate Report'],
    navigation: [
        { id: 'overview', label: 'Overview' },
        { id: 'fleet', label: 'Fleet' },
        { id: 'staff', label: 'Staff' },
        { id: 'reports', label: 'Reports' },
    ],
    sections: {
        overview: {
            heading: 'Operations Overview',
            description: 'Get a high-level view of transport activity.',
            cards: [
                'Active routes today',
                'Late routes count',
                'Open incident count',
            ],
        },
        fleet: {
            heading: 'Fleet Management',
            description: 'Track buses, number plates, and maintenance.',
            cards: [
                'Active buses',
                'Maintenance due list',
                'Number plate assignment',
            ],
        },
        staff: {
            heading: 'Staff Allocation',
            description: 'Manage drivers and bus assistants.',
            cards: [
                'Driver assignments',
                'Bus assistant assignments',
                'Attendance and leave',
            ],
        },
        reports: {
            heading: 'Reports Center',
            description: 'Review and export transport performance reports.',
            cards: [
                'Route performance trends',
                'Incident frequency report',
                'Monthly operations summary',
            ],
        },
    },
}

const TransportManagerDashboard = ({ activeSection }: TransportManagerDashboardProps) => {
    const defaultSection = transportManagerDashboardConfig.navigation[0].id
    const section =
        transportManagerDashboardConfig.sections[activeSection] ||
        transportManagerDashboardConfig.sections[defaultSection]

    return (
        <>
            <div className="dashboardCards">
                {section.cards.map((card) => (
                    <article key={card} className="dashboardCard">
                        <p>{card}</p>
                    </article>
                ))}
            </div>
        </>
    )
}

export default TransportManagerDashboard
