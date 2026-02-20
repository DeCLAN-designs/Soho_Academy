import type { DashboardRoleConfig } from '../dashboard.types'
import DriverAttendanceMenuItem from './DriverMenuItems/Attendance/Attendance'
import DriverCompliantsReportsMenuItem from './DriverMenuItems/Compliants&Reports/Compliants&Reports'
import DriverDashboardMenuItem from './DriverMenuItems/Dashboard/Dashboard'
import DriverFuelMaintenanceMenuItem from './DriverMenuItems/Fuel & Maintenance/Fuel&Maintence'
import './DriverDashboard.css'

type DriverDashboardProps = {
    activeSection: string
}

export const driverDashboardConfig: DashboardRoleConfig = {
    title: 'Driver Dashboard',
    subtitle: 'Run assigned routes, attendance, and incidents.',
    quickActions: ['Start Route', 'End Route', 'Report Incident'],
    navigation: [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'attendance', label: 'Attendance' },
        { id: 'fuelMaintenance', label: 'Fuel & Maintenance' },
        { id: 'incidents', label: 'Incidents & Accidents' },
        { id: 'compliantsReports', label: 'Compliants & Reports' },
        { id: 'myActivity', label: 'My Activity' },
        { id: 'profile', label: 'Profile' },
    ],
    sections: {
        dashboard: {
            heading: 'Driver Dashboard',
            description: 'Track route progress and student safety.',
            cards: [
                'Current route progress',
                'Students onboard count',
                'Expected arrival time',
            ],
        },
        attendance: {
            heading: 'Attendance',
            description: 'Mark and review student attendance at every stop.',
            cards: [
                'Boarding attendance list',
                'Drop-off confirmation list',
                'Missed student attendance log',
            ],
        },
        fuelMaintenance: {
            heading: 'Fuel & Maintenance',
            description: 'Monitor fuel usage and bus service readiness.',
            cards: [
                'Fuel refill history',
                'Current fuel level trend',
                'Scheduled maintenance checklist',
            ],
        },
        incidents: {
            heading: 'Incidents & Accidents',
            description: 'Capture transport incidents with required safety details.',
            cards: [
                'Open incident reports',
                'Resolved incident archive',
                'Accident escalation contacts',
            ],
        },
        compliantsReports: {
            heading: 'Compliants & Reports',
            description: 'Review compliants tasks and route reporting summaries.',
            cards: [
                'Daily compliants checklist',
                'Route completion report',
                'Safety audit status',
            ],
        },
        myActivity: {
            heading: 'My Activity',
            description: 'Review your recent transport actions and timeline history.',
            cards: [
                'Recent attendance updates',
                'Recent incident entries',
                'Latest route actions',
            ],
        },
        profile: {
            heading: 'Driver Profile',
            description: 'Maintain personal details and assigned route preferences.',
            cards: [
                'Contact details',
                'License and permit validity',
                'Route preference settings',
            ],
        },
    },
}

const DriverDashboard = ({ activeSection }: DriverDashboardProps) => {
    const defaultSection = driverDashboardConfig.navigation[0].id
    const section = driverDashboardConfig.sections[activeSection] || driverDashboardConfig.sections[defaultSection]
    const sectionId = driverDashboardConfig.sections[activeSection] ? activeSection : defaultSection

    const getSectionWidget = () => {
        switch (sectionId) {
            case 'dashboard':
                return <DriverDashboardMenuItem />
            case 'attendance':
                return <DriverAttendanceMenuItem />
            case 'fuelMaintenance':
                return <DriverFuelMaintenanceMenuItem />
            case 'compliantsReports':
                return <DriverCompliantsReportsMenuItem />
            default:
                return null
        }
    }

    const sectionWidget = getSectionWidget()

    return (
        <>
            {sectionWidget ? <div className="driverDashboardSectionPanel">{sectionWidget}</div> : null}

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
