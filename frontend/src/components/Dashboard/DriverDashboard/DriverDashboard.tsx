import type { DashboardRoleConfig } from '../dashboard.types'

type DriverDashboardProps = {
    activeSection: string
}

export const driverDashboardConfig: DashboardRoleConfig = {
    title: 'Driver Dashboard',
    subtitle: 'Run assigned routes, attendance, and incidents.',
    quickActions: ['Start Route', 'End Route', 'Report Incident'],
    navigation: [
        { id: 'overview', label: 'Overview' },
        { id: 'routes', label: 'Routes' },
        { id: 'boarding', label: 'Boarding' },
        { id: 'incidents', label: 'Incidents' },
    ],
    sections: {
        overview: {
            heading: 'Driver Overview',
            description: 'Track route progress and student safety.',
            cards: [
                'Current route progress',
                'Students onboard count',
                'Expected arrival time',
            ],
        },
        routes: {
            heading: 'Assigned Routes',
            description: 'Review today routes and stop sequence.',
            cards: [
                'Morning route stop order',
                'Evening route stop order',
                'Route notes from manager',
            ],
        },
        boarding: {
            heading: 'Boarding & Drop-off',
            description: 'Confirm each child at pickup and drop-off.',
            cards: [
                'Boarding attendance list',
                'Drop-off completion list',
                'Missed boarding log',
            ],
        },
        incidents: {
            heading: 'Incidents',
            description: 'Create and review incident records.',
            cards: [
                'Open incident reports',
                'Resolved incidents',
                'Safety checklist reminders',
            ],
        },
    },
}

const DriverDashboard = ({ activeSection }: DriverDashboardProps) => {
    const defaultSection = driverDashboardConfig.navigation[0].id
    const section = driverDashboardConfig.sections[activeSection] || driverDashboardConfig.sections[defaultSection]

    return (
        <>
            <div className="dashboardSection">
                <h2>{section.heading}</h2>
                <p>{section.description}</p>
            </div>

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

export default DriverDashboard
