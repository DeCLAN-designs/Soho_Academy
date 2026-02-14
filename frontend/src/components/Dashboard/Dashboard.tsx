import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { authApi } from '../../lib/api'
import DashboardHeader from '../DashboardHeader/DashboardHeader'
import SideBar from '../SideBar/SideBar'
import BusAssistantDashboard, {
    busAssistantDashboardConfig,
} from './BusAssistantDashboard/BusAssistantDashboard'
import DriverDashboard, { driverDashboardConfig } from './DriverDashboard/DriverDashboard'
import ParentDashboard, { parentDashboardConfig } from './ParentDashboard/ParentDashboard'
import TransportManagerDashboard, {
    transportManagerDashboardConfig,
} from './TransportManagerDashboard/TransportManagerDashboard'
import type { DashboardRoleConfig } from './dashboard.types'
import './Dashboard.css'

type DashboardProps = {
    role: string
    onLogout: () => void
}

type RoleDashboardContentProps = {
    activeSection: string
}

type RoleDashboardEntry = {
    config: DashboardRoleConfig
    Component: (props: RoleDashboardContentProps) => ReactElement
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
}

const Dashboard = ({ role, onLogout }: DashboardProps) => {
    const roleDashboard = ROLE_DASHBOARD_MAP[role]
    const config = roleDashboard?.config || FALLBACK_CONFIG
    const RoleDashboard = roleDashboard?.Component || FallbackDashboard
    const [activeSection, setActiveSection] = useState(config.navigation[0].id)

    useEffect(() => {
        setActiveSection(config.navigation[0].id)
    }, [role, config])

    const handleLogout = async () => {
        try {
            await authApi.logout()
        } catch (error) {
            console.error('Logout error:', error)
        } finally {
            onLogout()
        }
    }

    return (
        <div className="dashboardLayout">
            <div className="dashboardSidebar">
                <SideBar role={role} items={config.navigation} activeItem={activeSection} onSelect={setActiveSection} />
            </div>

            <div className="dashboardTopBar">
                <DashboardHeader
                    role={role}
                    title={config.title}
                    subtitle={config.subtitle}
                    quickActions={config.quickActions}
                    onLogout={handleLogout}
                />
            </div>

            <section className="dashboardMain">
                <RoleDashboard activeSection={activeSection} />
            </section>
        </div>
    )
}

export default Dashboard
