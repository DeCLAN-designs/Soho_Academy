dashboard_path = "src/components/Dashboard/TransportManagerDashboard/TransportManagerDashboard.tsx"

new_content = """import React, { Suspense } from 'react'
import type { TransportManagerDashboardProps, TabComponentProps } from '../dashboard.types'
import { isFleetSubTab } from './Tabs/Fleet/fleetSubTabs'
import { isRoutesSubTab } from './Tabs/Routes/routesSubTabs'
import { isStudentsSubTab } from './Tabs/Students/studentsSubTabs'
import { isStaffSubTab } from './Tabs/Staff/staffSubTabs'
import { isSafetyIncidentsSubTab } from './Tabs/SafetyIncidents/safetyIncidentsSubTabs'
import { isRequestsSubTab } from './Tabs/Requests/requestsSubTabs'
import { isCommunicationSubTab } from './Tabs/Communication/communicationSubTabs'
import { isReportsSubTab } from './Tabs/Reports/reportsSubTabs'
import Loader from '../../Loader/Loader'
import { transportManagerDashboardConfig } from './transportManagerDashboard.config'

// Tab Components
import DashboardTab from './Tabs/Dashboard/DashboardTab'
import FleetTab from './Tabs/Fleet/FleetTab'
import RoutesTab from './Tabs/Routes/RoutesTab'
import StudentsTab from './Tabs/Students/StudentsTab'
import StaffTab from './Tabs/Staff/StaffTab'
import SafetyIncidentsTab from './Tabs/SafetyIncidents/SafetyIncidentsTab'
import RequestsTab from './Tabs/Requests/RequestsTab'
import CommunicationTab from './Tabs/Communication/CommunicationTab'
import ReportsTab from './Tabs/Reports/ReportsTab'
import AuditLogsTab from './Tabs/AuditLogs/AuditLogsTab'
import SettingsTab from './Tabs/Settings/SettingsTab'

import './TransportManagerDashboard.css'

const TAB_COMPONENTS: Record<string, React.ComponentType<TabComponentProps>> = {
    dashboard: DashboardTab,
    'audit-logs': AuditLogsTab,
    settings: SettingsTab,
}

const TabFallback = () => <Loader variant="inline" label="Loading" />

const TransportManagerDashboard = ({ activeSection }: TransportManagerDashboardProps) => {
    const defaultSection = transportManagerDashboardConfig.navigation[0].id
    const sectionId = activeSection || defaultSection
    const section = transportManagerDashboardConfig.sections[sectionId] || 
                    transportManagerDashboardConfig.sections[defaultSection]

    const renderTab = () => {
        // Fleet section and sub-tabs
        if (sectionId === 'fleet' || isFleetSubTab(sectionId)) {
            return <FleetTab section={section} activeSection={sectionId} />
        }

        // Routes section and sub-tabs
        if (sectionId === 'routes' || isRoutesSubTab(sectionId)) {
            return <RoutesTab section={section} activeSection={sectionId} />
        }

        // Students section and sub-tabs
        if (sectionId === 'students' || isStudentsSubTab(sectionId)) {
            return <StudentsTab section={section} activeSection={sectionId} />
        }

        // Staff section and sub-tabs
        if (sectionId === 'staff' || isStaffSubTab(sectionId)) {
            return <StaffTab section={section} activeSection={sectionId} />
        }

        // Safety & Incidents section and sub-tabs
        if (sectionId === 'safety-incidents' || isSafetyIncidentsSubTab(sectionId)) {
            return <SafetyIncidentsTab section={section} activeSection={sectionId} />
        }

        // Requests section and sub-tabs
        if (sectionId === 'requests' || isRequestsSubTab(sectionId)) {
            return <RequestsTab section={section} activeSection={sectionId} />
        }

        // Communication section and sub-tabs
        if (sectionId === 'communication' || isCommunicationSubTab(sectionId)) {
            return <CommunicationTab section={section} activeSection={sectionId} />
        }

        // Reports section and sub-tabs
        if (sectionId === 'reports' || isReportsSubTab(sectionId)) {
            return <ReportsTab section={section} activeSection={sectionId} />
        }

        // Handle flat components
        const Component = TAB_COMPONENTS[sectionId] || TAB_COMPONENTS[defaultSection]
        return <Component section={section} activeSection={sectionId} />
    }

    return (
        <Suspense fallback={<TabFallback />}>
            {renderTab()}
        </Suspense>
    )
}

export default TransportManagerDashboard
"""

with open(dashboard_path, "w") as f:
    f.write(new_content)

print("Updated TransportManagerDashboard.tsx")
