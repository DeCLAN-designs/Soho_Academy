import type { ReactElement } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import BusAssistantDashboard, {
    busAssistantDashboardConfig,
} from './BusAssistantDashboard/BusAssistantDashboard'
import DriverDashboard, { driverDashboardConfig } from './DriverDashboard/DriverDashboard'
import ParentDashboard, { parentDashboardConfig } from './ParentDashboard/ParentDashboard'
import SchoolAdminDashboard, {
    schoolAdminDashboardConfig,
} from './SchoolAdminDashboard/SchoolAdminDashboard'
import TransportManagerDashboard, {
    transportManagerDashboardConfig,
} from './TransportManagerDashboard/TransportManagerDashboard'
import type { DashboardRoleConfig } from './dashboard.types'
import './Dashboard.css'

type DashboardProps = {
    role?: string
}

type RoleDashboardContentProps = {
    activeSection: string
}

type RoleDashboardEntry = {
    config: DashboardRoleConfig
    Component: (props: RoleDashboardContentProps) => ReactElement
}

type LayoutOutletContext = {
    activeSection?: string
    role?: string
}

const FALLBACK_CONFIG: DashboardRoleConfig = {
    title: 'Dashboard',
    subtitle: 'Role not configured yet.',
    quickActions: ['Help'],
    navigation: [{ id: 'overview', label: 'Overview' }],
    sections: {
        overview: {
            heading: 'Overview',
            description: 'No role-specific setup available for this account.',
            cards: ['Contact admin to configure dashboard permissions.'],
        },
    },
}

const FallbackDashboard = ({ activeSection }: RoleDashboardContentProps) => {
    const defaultSection = FALLBACK_CONFIG.navigation[0].id
    const section = FALLBACK_CONFIG.sections[activeSection] || FALLBACK_CONFIG.sections[defaultSection]

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

const ROLE_DASHBOARD_MAP: Record<string, RoleDashboardEntry> = {
    Parent: {
        config: parentDashboardConfig,
        Component: ParentDashboard,
    },
    Driver: {
        config: driverDashboardConfig,
        Component: DriverDashboard,
    },
    'Bus Assistant': {
        config: busAssistantDashboardConfig,
        Component: BusAssistantDashboard,
    },
    'Transport Manager': {
        config: transportManagerDashboardConfig,
        Component: TransportManagerDashboard,
    },
    'School Admin': {
        config: schoolAdminDashboardConfig,
        Component: SchoolAdminDashboard,
    },
}

const Dashboard = ({ role: propRole }: DashboardProps) => {
    const { user } = useAuth()
    const outletContext = useOutletContext<LayoutOutletContext>()
    const role = propRole || outletContext?.role || user?.role || ''
    
    const roleDashboard = ROLE_DASHBOARD_MAP[role]
    const config = roleDashboard?.config || FALLBACK_CONFIG
    const RoleDashboard = roleDashboard?.Component || FallbackDashboard
    const activeSection = outletContext?.activeSection || config.navigation[0].id

    return (
        <div className="dashboardContent">
            <section className="dashboardMain">
                <div className="dashboardPanel">
                    <RoleDashboard activeSection={activeSection} />
                </div>
            </section>
        </div>
    )
}

export default Dashboard
