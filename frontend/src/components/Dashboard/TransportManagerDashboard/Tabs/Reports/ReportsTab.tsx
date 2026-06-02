import type { RoleSection } from '../../../dashboard.types'
import './ReportsTab.css'
import { OperationalReports } from './Tabs'
import { REPORTS_SUB_TABS, isReportsSubTab } from './reportsSubTabs'

interface ReportsTabProps {
    section: RoleSection
    activeSection: string
}

const ReportsTab = ({ section, activeSection }: ReportsTabProps) => {
    const activeSubTab = isReportsSubTab(activeSection) ? activeSection : 'operational-reports'
    const ActiveComponent = REPORTS_SUB_TABS.find((tab) => tab.id === activeSubTab)?.component || OperationalReports

    return (
        <div className="tabContent">
            <div className="subTabContent">
                <ActiveComponent section={section} />
            </div>
        </div>
    )
}

export default ReportsTab
