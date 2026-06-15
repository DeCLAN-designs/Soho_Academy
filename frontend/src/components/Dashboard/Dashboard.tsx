import React, { lazy, Suspense } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import type { DashboardRoleConfig } from './dashboard.types'
import Loader from '../Loader/Loader'
import './Dashboard.css'

// Lazy-load role-specific dashboards - only loads what's needed
const ParentDashboard = lazy(() => import('./ParentDashboard/ParentDashboard'))
const DriverDashboard = lazy(() => import('./DriverDashboard/DriverDashboard'))
const BusAssistantDashboard = lazy(() => import('./BusAssistantDashboard/BusAssistantDashboard'))
const TransportManagerDashboard = lazy(() => import('./TransportManagerDashboard/TransportManagerDashboard'))
const SchoolAdminDashboard = lazy(() => import('./SchoolAdminDashboard/SchoolAdminDashboard'))

// Import configs eagerly (they're lightweight objects)
import { parentDashboardConfig } from './ParentDashboard/ParentDashboard'
import { driverDashboardConfig } from './DriverDashboard/DriverDashboard'
import { busAssistantDashboardConfig } from './BusAssistantDashboard/BusAssistantDashboard'
import { transportManagerDashboardConfig } from './TransportManagerDashboard/transportManagerDashboard.config'
import { schoolAdminDashboardConfig } from './SchoolAdminDashboard/SchoolAdminDashboard'

type DashboardProps = {
    role?: string
}

type RoleDashboardContentProps = {
    activeSection: string
}

type LayoutOutletContext = {
    activeSection?: string
    role?: string
}

type RoleDashboardEntry = {
    config: DashboardRoleConfig
    Component: React.LazyExoticComponent<(props: RoleDashboardContentProps) => React.ReactElement>
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

// Role to dashboard mapping with lazy components
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

const FallbackDashboard = ({ activeSection }: RoleDashboardContentProps) => {
    const defaultSection = FALLBACK_CONFIG.navigation[0].id
    const section = FALLBACK_CONFIG.sections[activeSection] || 
                    FALLBACK_CONFIG.sections[defaultSection]

    return (
        <div className="dashboardCards">
            {section.cards.map((card) => (
                <article key={card} className="dashboardCard">
                    <p>{card}</p>
                </article>
            ))}
        </div>
    )
}

const Dashboard = ({ role: propRole }: DashboardProps) => {
    const { user } = useAuth()
    const outletContext = useOutletContext<LayoutOutletContext>()
    
    // Resolve role from props, context, or user auth
    const role = propRole || outletContext?.role || user?.role || ''
    
    // Get role-specific dashboard or fallback
    const roleDashboard = ROLE_DASHBOARD_MAP[role]
    const config = roleDashboard?.config || FALLBACK_CONFIG
    const RoleDashboard = roleDashboard?.Component || FallbackDashboard
    
    // Determine active section from context or use first navigation item
    const activeSection = outletContext?.activeSection || config.navigation[0]?.id || 'overview'

    return (
        <div className="dashboardContent">
            <section className="dashboardMain">
                <div className="dashboardPanel">
                    <Suspense fallback={<Loader variant="inline" label="Loading dashboard..." />}>
                        <RoleDashboard activeSection={activeSection} />
                    </Suspense>
                </div>
            </section>
        </div>
    )
}

export default Dashboard