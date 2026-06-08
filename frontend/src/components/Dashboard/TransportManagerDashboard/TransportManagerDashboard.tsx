import React, { Suspense } from 'react'
import { transportManagerDashboardConfig } from './transportManagerDashboard.config'
import type { DashboardRoleConfig } from '../dashboard.types'
import {
    DashboardTab,
    FleetTab,
    RoutesTab,
    StudentsTab,
    StaffTab,
    SafetyIncidentsTab,
    RequestsTab,
    CommunicationTab,
    ReportsTab,
    AuditLogsTab,
    SettingsTab,
} from './Tabs'
import { isFleetSubTab } from './Tabs/Fleet/fleetSubTabs'
import { isRoutesSubTab } from './Tabs/Routes/routesSubTabs'
import { isStudentsSubTab } from './Tabs/Students/studentsSubTabs'
import { isStaffSubTab } from './Tabs/Staff/staffSubTabs'
import { isSafetyIncidentsSubTab } from './Tabs/SafetyIncidents/safetyIncidentsSubTabs'
import { isRequestsSubTab } from './Tabs/Requests/requestsSubTabs'
import { isCommunicationSubTab } from './Tabs/Communication/communicationSubTabs'
import { isReportsSubTab } from './Tabs/Reports/reportsSubTabs'
import Loader from '../../Loader/Loader'

type TransportManagerDashboardProps = {
    activeSection: string
}

type SectionKey = keyof DashboardRoleConfig['sections']
type TabComponentProps = {
    section: DashboardRoleConfig['sections'][SectionKey]
    activeSection?: string
}

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

        // Safety incidents section and sub-tabs
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

        // Direct tab matches from TAB_COMPONENTS
        const TabComponent = TAB_COMPONENTS[sectionId]
        if (TabComponent) {
            return <TabComponent section={section} />
        }

        // Default fallback
        return <DashboardTab section={section} />
    }

    return (
        <Suspense fallback={<TabFallback />}>
            {renderTab()}
        </Suspense>
    )
}

export default TransportManagerDashboard