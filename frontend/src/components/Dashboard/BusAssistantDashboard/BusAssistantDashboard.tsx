import type { DashboardRoleConfig } from '../dashboard.types'
import BusAssistantDashboardMenuItem from './BusAssistantMenuItems/Dashboard/Dashboard'
import BusAssistantAttendanceMenuItem from './BusAssistantMenuItems/Attendance/Attendance'
import BusAssistantAccidentsReportsMenuItem from './BusAssistantMenuItems/AccidentsReports/AccidentsReports'
import BusAssistantComplaintsIncidentsMenuItem from './BusAssistantMenuItems/ComplaintsIncidents/ComplaintsIncidents'
import BusAssistantProfileMenuItem from './BusAssistantMenuItems/Profile/Profile'
import './BusAssistantDashboard.css'

type BusAssistantDashboardProps = {
    activeSection: string
}

const BusAssistantDashboard = ({ activeSection }: BusAssistantDashboardProps) => {
    const renderMenuItem = () => {
        switch (activeSection) {
            case 'overview':
                return <BusAssistantDashboardMenuItem />
            case 'attendance':
                return <BusAssistantAttendanceMenuItem />
            case 'accidents-reports':
                return <BusAssistantAccidentsReportsMenuItem />
            case 'complaints-incidents':
                return <BusAssistantComplaintsIncidentsMenuItem />
            case 'profile':
                return <BusAssistantProfileMenuItem />
            default:
                return <BusAssistantDashboardMenuItem />
        }
    }

    return (
        <>
            {renderMenuItem()}
        </>
    )
}

export const busAssistantDashboardConfig: DashboardRoleConfig = {
    title: 'Bus Assistant Dashboard',
    subtitle: 'Handle student boarding and safety support.',
    quickActions: ['Boarding List', 'Safety Check', 'Notify Driver'],
    navigation: [
        { id: 'overview', label: 'Dashboard' },
        { id: 'attendance', label: 'Attendance' },
        { id: 'accidents-reports', label: 'Accidents and Reports' },
        { id: 'complaints-incidents', label: 'Complaints and incidents' },
        { id: 'profile', label: 'Profile' },
    ],
    sections: {
        overview: {
            heading: 'Dashboard',
            description: 'Coordinate with the driver and track student flow.',
            cards: [],
        },
        attendance: {
            heading: 'Attendance',
            description: 'Track student boarding and drop-off attendance.',
            cards: [],
        },
        'accidents-reports': {
            heading: 'Accidents and Reports',
            description: 'Document and report accidents and incidents.',
            cards: [],
        },
        'complaints-incidents': {
            heading: 'Complaints and Incidents',
            description: 'Handle complaints and incident reports.',
            cards: [],
        },
        profile: {
            heading: 'Profile',
            description: 'Manage your bus assistant profile and settings.',
            cards: [],
        },
    },
}

export default BusAssistantDashboard
