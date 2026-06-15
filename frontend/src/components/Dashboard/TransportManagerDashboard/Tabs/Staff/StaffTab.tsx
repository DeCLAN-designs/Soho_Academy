import type { RoleSection } from '../../../dashboard.types'
import './StaffTab.css'
import { Drivers } from './Tabs'
import { STAFF_SUB_TABS, isStaffSubTab } from './staffSubTabs'

interface StaffTabProps {
    section: RoleSection
    activeSection: string
}

const StaffTab = ({ section, activeSection }: StaffTabProps) => {
    const activeSubTab = isStaffSubTab(activeSection) ? activeSection : 'drivers'
    const ActiveComponent = STAFF_SUB_TABS.find((tab) => tab.id === activeSubTab)?.component || Drivers

    return (
        <div className="tabContent">
            <div className="subTabContent">
                <ActiveComponent section={section} />
            </div>
        </div>
    )
}

export default StaffTab
