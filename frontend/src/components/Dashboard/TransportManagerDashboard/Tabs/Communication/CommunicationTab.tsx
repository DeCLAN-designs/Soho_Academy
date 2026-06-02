import type { RoleSection } from '../../../dashboard.types'
import './CommunicationTab.css'
import { Announcements } from './Tabs'
import { COMMUNICATION_SUB_TABS, isCommunicationSubTab } from './communicationSubTabs'

interface CommunicationTabProps {
    section: RoleSection
    activeSection: string
}

const CommunicationTab = ({ section, activeSection }: CommunicationTabProps) => {
    const activeSubTab = isCommunicationSubTab(activeSection) ? activeSection : 'announcements'
    const ActiveComponent = COMMUNICATION_SUB_TABS.find((tab) => tab.id === activeSubTab)?.component || Announcements

    return (
        <div className="tabContent">
            <div className="subTabContent">
                <ActiveComponent section={section} />
            </div>
        </div>
    )
}

export default CommunicationTab
