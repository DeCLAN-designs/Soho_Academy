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

type TransportManagerDashboardProps = {
    activeSection: string
}

type SectionKey = keyof DashboardRoleConfig['sections']
type TabComponentProps = {
    section: DashboardRoleConfig['sections'][SectionKey]
}

const TAB_COMPONENTS: Record<string, React.ComponentType<TabComponentProps>> = {
    dashboard: DashboardTab,
    'audit-logs': AuditLogsTab,
    settings: SettingsTab,
}

const TransportManagerDashboard = ({ activeSection }: TransportManagerDashboardProps) => {
    const defaultSection = transportManagerDashboardConfig.navigation[0].id
    const sectionId = activeSection || defaultSection
    const section = transportManagerDashboardConfig.sections[sectionId] || transportManagerDashboardConfig.sections[defaultSection]

    if (sectionId === 'fleet' || isFleetSubTab(sectionId)) {
        return <FleetTab section={section} activeSection={sectionId} />
    }

    if (sectionId === 'routes' || isRoutesSubTab(sectionId)) {
        return <RoutesTab section={section} activeSection={sectionId} />
    }

    if (sectionId === 'students' || isStudentsSubTab(sectionId)) {
        return <StudentsTab section={section} activeSection={sectionId} />
    }

    if (sectionId === 'staff' || isStaffSubTab(sectionId)) {
        return <StaffTab section={section} activeSection={sectionId} />
    }

    if (sectionId === 'safety-incidents' || isSafetyIncidentsSubTab(sectionId)) {
        return <SafetyIncidentsTab section={section} activeSection={sectionId} />
    }

    if (sectionId === 'requests' || isRequestsSubTab(sectionId)) {
        return <RequestsTab section={section} activeSection={sectionId} />
    }

    if (sectionId === 'communication' || isCommunicationSubTab(sectionId)) {
        return <CommunicationTab section={section} activeSection={sectionId} />
    }

    if (sectionId === 'reports' || isReportsSubTab(sectionId)) {
        return <ReportsTab section={section} activeSection={sectionId} />
    }

    const TabComponent = TAB_COMPONENTS[sectionId] || DashboardTab

    return <TabComponent section={section} />
}

export default TransportManagerDashboard
