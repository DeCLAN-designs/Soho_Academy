import type { DashboardRoleConfig } from '../dashboard.types'

type ParentDashboardProps = {
    activeSection: string
}

export const parentDashboardConfig: DashboardRoleConfig = {
    title: 'Parent Dashboard',
    subtitle: 'Monitor your child transport schedule and updates.',
    quickActions: ['Track Bus', 'Absence Notice', 'Support'],
    navigation: [
        { id: 'overview', label: 'Overview' },
        { id: 'children', label: 'Children' },
        { id: 'trips', label: 'Trips' },
        { id: 'alerts', label: 'Alerts' },
    ],
    sections: {
        overview: {
            heading: 'Parent Overview',
            description: 'See trip status and notifications for your children.',
            cards: [
                'Today pickup status',
                'Today drop-off status',
                'Pending transport alerts',
            ],
        },
        children: {
            heading: 'Children Profiles',
            description: 'Manage child transport profile details.',
            cards: [
                'Assigned route and pickup point',
                'Emergency contact details',
                'Attendance summary',
            ],
        },
        trips: {
            heading: 'Trip Timeline',
            description: 'Review completed and upcoming transport activity.',
            cards: [
                'Morning route timeline',
                'Evening route timeline',
                'Recent trip history',
            ],
        },
        alerts: {
            heading: 'Alerts & Messages',
            description: 'Keep up with route changes and driver updates.',
            cards: [
                'Delay notices',
                'Route change notices',
                'General transport announcements',
            ],
        },
    },
}

const ParentDashboard = ({ activeSection }: ParentDashboardProps) => {
    const defaultSection = parentDashboardConfig.navigation[0].id
    const section = parentDashboardConfig.sections[activeSection] || parentDashboardConfig.sections[defaultSection]

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

export default ParentDashboard
