import type { RoleSection } from '../../../dashboard.types'
import './RequestsTab.css'
import { FuelRequests } from './Tabs'
import { REQUESTS_SUB_TABS, isRequestsSubTab } from './requestsSubTabs'

interface RequestsTabProps {
    section: RoleSection
    activeSection: string
}

const RequestsTab = ({ section, activeSection }: RequestsTabProps) => {
    const activeSubTab = isRequestsSubTab(activeSection) ? activeSection : 'fuel-requests'
    const ActiveComponent = REQUESTS_SUB_TABS.find((tab) => tab.id === activeSubTab)?.component || FuelRequests

    return (
        <div className="tabContent">
            <div className="subTabContent">
                <ActiveComponent section={section} />
            </div>
        </div>
    )
}

export default RequestsTab
