import type { RoleSection } from '../../../dashboard.types'
import './FleetTab.css'
import { Vehicles } from './Tabs'
import { FLEET_SUB_TABS, isFleetSubTab } from './fleetSubTabs'

interface FleetTabProps {
    section: RoleSection
    activeSection: string
}

const FleetTab = ({ section, activeSection }: FleetTabProps) => {
    const activeSubTab = isFleetSubTab(activeSection) ? activeSection : 'vehicles'
    const ActiveComponent = FLEET_SUB_TABS.find((tab) => tab.id === activeSubTab)?.component || Vehicles

    return (
        <div className="tabContent">
            <div className="subTabContent">
                <ActiveComponent section={section} />
            </div>
        </div>
    )
}

export default FleetTab
