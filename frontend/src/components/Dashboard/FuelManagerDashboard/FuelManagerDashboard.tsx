import React, { Suspense } from 'react'
import Loader from '../../Loader/Loader'
import { fuelManagerDashboardConfig } from './fuelManagerDashboard.config'
import { FuelManagementProvider } from './Tabs/FuelManagement/FuelManagementContext'

// Tab Components
import DashboardTab from './Tabs/Dashboard/DashboardTab'
import FuelRequestsTab from './Tabs/FuelRequests/FuelRequestsTab'
import FuelApprovalsTab from './Tabs/FuelApprovals/FuelApprovalsTab'
import FuelLogsTab from './Tabs/FuelLogs/FuelLogsTab'
import AnalyticsTab from './Tabs/Analytics/AnalyticsTab'
import MileageAnomaliesTab from './Tabs/MileageAnomalies/MileageAnomaliesTab'

import './FuelManagerDashboard.css'

interface FuelManagerDashboardProps {
    activeSection?: string
}

const TAB_COMPONENTS: Record<string, React.ComponentType> = {
    dashboard: DashboardTab,
    'fuel-requests': FuelRequestsTab,
    'fuel-approvals': FuelApprovalsTab,
    'fuel-logs': FuelLogsTab,
    analytics: AnalyticsTab,
    'mileage-anomalies': MileageAnomaliesTab,
}

const TabFallback = () => <Loader variant="inline" label="Loading" />

const FuelManagerDashboard = ({ activeSection }: FuelManagerDashboardProps) => {
    const defaultSection = fuelManagerDashboardConfig.navigation[0].id
    const sectionId = activeSection || defaultSection

    const Component = TAB_COMPONENTS[sectionId] || TAB_COMPONENTS[defaultSection]

    return (
        <FuelManagementProvider>
            <Suspense fallback={<TabFallback />}>
                <Component />
            </Suspense>
        </FuelManagementProvider>
    )
}

export default FuelManagerDashboard
