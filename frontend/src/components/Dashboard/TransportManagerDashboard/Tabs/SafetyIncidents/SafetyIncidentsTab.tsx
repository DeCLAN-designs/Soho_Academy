import type { RoleSection } from '../../../dashboard.types'
import './SafetyIncidentsTab.css'
import { IncidentReports } from './Tabs'
import { SAFETY_INCIDENTS_SUB_TABS, isSafetyIncidentsSubTab } from './safetyIncidentsSubTabs'

interface SafetyIncidentsTabProps {
    section: RoleSection
    activeSection: string
}

const SafetyIncidentsTab = ({ section, activeSection }: SafetyIncidentsTabProps) => {
    const activeSubTab = isSafetyIncidentsSubTab(activeSection) ? activeSection : 'incident-reports'
    const ActiveComponent = SAFETY_INCIDENTS_SUB_TABS.find((tab) => tab.id === activeSubTab)?.component || IncidentReports

    return (
        <div className="tabContent">
            <div className="subTabContent">
                <ActiveComponent section={section} />
            </div>
        </div>
    )
}

export default SafetyIncidentsTab
