import type { DashboardRoleConfig } from '../dashboard.types'

type BusAssistantDashboardProps = {
    activeSection: string
}

export const busAssistantDashboardConfig: DashboardRoleConfig = {
    title: 'Bus Assistant Dashboard',
    subtitle: 'Handle student boarding and safety support.',
    quickActions: ['Boarding List', 'Safety Check', 'Notify Driver'],
    navigation: [
        { id: 'overview', label: 'Overview' },
        { id: 'boarding', label: 'Boarding' },
        { id: 'students', label: 'Students' },
        { id: 'safety', label: 'Safety' },
    ],
    sections: {
        overview: {
            heading: 'Assistant Overview',
            description: 'Coordinate with the driver and track student flow.',
            cards: [
                'Current bus occupancy',
                'Pending stop verifications',
                'Latest safety notes',
            ],
        },
        boarding: {
            heading: 'Boarding Status',
            description: 'Mark student pickup and drop-off in real time.',
            cards: [
                'Waiting students',
                'Boarded students',
                'Drop-off completion',
            ],
        },
        students: {
            heading: 'Student Support',
            description: 'Manage special care and communication notes.',
            cards: [
                'Special care indicators',
                'Guardian contact quick list',
                'Student seating reminders',
            ],
        },
        safety: {
            heading: 'Safety Tasks',
            description: 'Ensure trip safety checkpoints are completed.',
            cards: [
                'Seat belt checks',
                'Emergency kit checklist',
                'Bus entry and exit checks',
            ],
        },
    },
}

const BusAssistantDashboard = ({ activeSection }: BusAssistantDashboardProps) => {
    const defaultSection = busAssistantDashboardConfig.navigation[0].id
    const section =
        busAssistantDashboardConfig.sections[activeSection] ||
        busAssistantDashboardConfig.sections[defaultSection]

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

export default BusAssistantDashboard
