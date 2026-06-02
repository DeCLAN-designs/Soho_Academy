import type { ComponentType } from 'react'
import type { RoleSection } from '../../../dashboard.types'
import { Drivers, BusAssistants, Scheduling } from './Tabs'

export type StaffSubTabType = 'drivers' | 'bus-assistants' | 'scheduling'

type StaffSubTab = {
    id: StaffSubTabType
    label: string
    component: ComponentType<{ section: RoleSection }>
}

export const STAFF_SUB_TABS: StaffSubTab[] = [
    { id: 'drivers', label: 'Drivers', component: Drivers },
    { id: 'bus-assistants', label: 'Bus Assistants', component: BusAssistants },
    { id: 'scheduling', label: 'Scheduling', component: Scheduling },
]

export const isStaffSubTab = (sectionId: string): sectionId is StaffSubTabType => {
    return STAFF_SUB_TABS.some((tab) => tab.id === sectionId)
}
