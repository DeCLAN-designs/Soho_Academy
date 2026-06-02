import type { RoleSection } from '../../../dashboard.types'
import './RoutesTab.css'
import { RoutePlanning } from './Tabs'
import { ROUTES_SUB_TABS, isRoutesSubTab } from './routesSubTabs'

interface RoutesTabProps {
    section: RoleSection
    activeSection: string
}

const RoutesTab = ({ section, activeSection }: RoutesTabProps) => {
    const activeSubTab = isRoutesSubTab(activeSection) ? activeSection : 'route-planning'
    const ActiveComponent = ROUTES_SUB_TABS.find((tab) => tab.id === activeSubTab)?.component || RoutePlanning

    return (
        <div className="tabContent">
            <div className="subTabContent">
                <ActiveComponent section={section} />
            </div>
        </div>
    )
}

export default RoutesTab
