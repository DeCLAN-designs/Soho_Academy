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

type TransportManagerDashboardProps = {
    activeSection: string
}

type SectionKey = keyof DashboardRoleConfig['sections']
type TabComponentProps = {
    section: DashboardRoleConfig['sections'][SectionKey]
}

const TAB_COMPONENTS: Record<string, React.ComponentType<TabComponentProps>> = {
    dashboard: DashboardTab,
    routes: RoutesTab,
    students: StudentsTab,
    staff: StaffTab,
    'safety-incidents': SafetyIncidentsTab,
    requests: RequestsTab,
    communication: CommunicationTab,
    reports: ReportsTab,
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

    const TabComponent = TAB_COMPONENTS[sectionId] || DashboardTab

    return <TabComponent section={section} />
}

export default TransportManagerDashboard
