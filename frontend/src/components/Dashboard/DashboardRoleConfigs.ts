// roleConfigs.ts — plain config objects only, zero component code
import type { DashboardRoleConfig } from './dashboard.types'
import { parentDashboardConfig } from './ParentDashboard/ParentDashboard'
import { driverDashboardConfig } from './DriverDashboard/DriverDashboard'
import { busAssistantDashboardConfig } from './BusAssistantDashboard/BusAssistantDashboard'
import { transportManagerDashboardConfig } from './TransportManagerDashboard/transportManagerDashboard.config'
import { schoolAdminDashboardConfig } from './SchoolAdminDashboard/SchoolAdminDashboard'

// Role to configuration mapping
export const ROLE_CONFIG_MAP: Record<string, DashboardRoleConfig> = {
    Parent: parentDashboardConfig,
    Driver: driverDashboardConfig,
    'Bus Assistant': busAssistantDashboardConfig,
    'Transport Manager': transportManagerDashboardConfig,
    'School Admin': schoolAdminDashboardConfig,
}

// Fallback configuration for unknown roles
export const FALLBACK_HEADER_CONFIG: DashboardRoleConfig = {
    title: 'Dashboard',
    subtitle: 'Role not configured yet.',
    quickActions: ['Help'],
    navigation: [{ id: 'overview', label: 'Overview' }],
    sections: {
        overview: {
            heading: 'Overview',
            description: 'No role-specific dashboard setup available for this account.',
            cards: [],
        },
    },
}