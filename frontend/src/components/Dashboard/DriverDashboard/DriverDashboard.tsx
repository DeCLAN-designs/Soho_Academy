import type { DashboardRoleConfig } from '../dashboard.types'
import DriverAttendanceMenuItem from './DriverMenuItems/Attendance/Attendance'
import DriverCompliantsReportsMenuItem from './DriverMenuItems/Compliants&Reports/Compliants&Reports'
import DriverDashboardMenuItem from './DriverMenuItems/Dashboard/Dashboard'
import DriverFuelMaintenanceMenuItem from './DriverMenuItems/Fuel & Maintenance/Fuel&Maintence'
import DriverIncidentsAndAccidentsMenuItem from './DriverMenuItems/IncidentsAndAccidents/IncidentsAndAccidents'
import DriverMyActivityMenuItem from './DriverMenuItems/MyActivity/MyActivity'
import DriverProfileMenuItem from './DriverMenuItems/Profile/Profile'
import './DriverDashboard.css'

type DriverDashboardProps = {
    activeSection: string
}

export const driverDashboardConfig: DashboardRoleConfig = {
    title: 'Driver Dashboard',
    subtitle: 'Run assigned routes, attendance, and incidents.',
    quickActions: [],
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
            cards: [],
        },
        attendance: {
            heading: 'Attendance',
            description: 'Mark and review student attendance at every stop.',
            cards: [],
        },
        fuelMaintenance: {
            heading: 'Fuel & Maintenance',
            description: 'Monitor fuel usage and bus service readiness.',
            cards: [],
        },
        incidents: {
            heading: 'Incidents & Accidents',
            description: 'Capture transport incidents with required safety details.',
            cards: [],
        },
        compliantsReports: {
            heading: 'Compliants & Reports',
            description: 'Review compliants tasks and route reporting summaries.',
            cards: [],
        },
        myActivity: {
            heading: 'My Activity',
            description: 'Review your latest driver records and reporting history.',
            cards: [],
        },
        profile: {
            heading: 'Profile',
            description: 'Review your current account and assigned vehicle details.',
            cards: [],
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
            case 'incidents':
                return <DriverIncidentsAndAccidentsMenuItem />
            case 'compliantsReports':
                return <DriverCompliantsReportsMenuItem />
            case 'myActivity':
                return <DriverMyActivityMenuItem />
            case 'profile':
                return <DriverProfileMenuItem />
            default:
                return null
        }
    }

    const sectionWidget = getSectionWidget()

    return (
        <>
            {sectionWidget ? <div className="driverDashboardSectionPanel">{sectionWidget}</div> : null}

            {section.cards.length > 0 ? (
                <div className="dashboardCards">
                    {section.cards.map((card) => (
                        <article key={card} className="dashboardCard">
                            <p>{card}</p>
                        </article>
                    ))}
                </div>
            ) : null}
        </>
    )
}

export default DriverDashboard
