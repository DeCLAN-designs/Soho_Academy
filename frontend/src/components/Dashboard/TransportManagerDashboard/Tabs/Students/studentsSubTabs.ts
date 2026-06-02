import type { ComponentType } from 'react'
import type { RoleSection } from '../../../dashboard.types'
import { Assignments, Attendance, ChangeRequests } from './Tabs'

export type StudentsSubTabType = 'assignments' | 'attendance' | 'change-requests'

type StudentsSubTab = {
    id: StudentsSubTabType
    label: string
    component: ComponentType<{ section: RoleSection }>
}

export const STUDENTS_SUB_TABS: StudentsSubTab[] = [
    { id: 'assignments', label: 'Assignments', component: Assignments },
    { id: 'attendance', label: 'Attendance', component: Attendance },
    { id: 'change-requests', label: 'Change Requests', component: ChangeRequests },
]

export const isStudentsSubTab = (sectionId: string): sectionId is StudentsSubTabType => {
    return STUDENTS_SUB_TABS.some((tab) => tab.id === sectionId)
}
