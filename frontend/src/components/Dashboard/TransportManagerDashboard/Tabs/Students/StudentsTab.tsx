import type { RoleSection } from '../../../dashboard.types'
import './StudentsTab.css'
import { Assignments } from './Tabs'
import { STUDENTS_SUB_TABS, isStudentsSubTab } from './studentsSubTabs'

interface StudentsTabProps {
    section: RoleSection
    activeSection: string
}

const StudentsTab = ({ section, activeSection }: StudentsTabProps) => {
    const activeSubTab = isStudentsSubTab(activeSection) ? activeSection : 'assignments'
    const ActiveComponent = STUDENTS_SUB_TABS.find((tab) => tab.id === activeSubTab)?.component || Assignments

    return (
        <div className="tabContent">
            <div className="subTabContent">
                <ActiveComponent section={section} />
            </div>
        </div>
    )
}

export default StudentsTab
