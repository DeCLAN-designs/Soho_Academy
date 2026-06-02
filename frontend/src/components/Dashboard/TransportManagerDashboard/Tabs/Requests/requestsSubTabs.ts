import type { ComponentType } from 'react'
import type { RoleSection } from '../../../dashboard.types'
import { FuelRequests, MaintenanceRequests, StudentRequests, RouteRequests } from './Tabs'

export type RequestsSubTabType = 'fuel-requests' | 'maintenance-requests' | 'student-requests' | 'route-requests'

type RequestsSubTab = {
    id: RequestsSubTabType
    label: string
    component: ComponentType<{ section: RoleSection }>
}

export const REQUESTS_SUB_TABS: RequestsSubTab[] = [
    { id: 'fuel-requests', label: 'Fuel Requests', component: FuelRequests },
    { id: 'maintenance-requests', label: 'Maintenance Requests', component: MaintenanceRequests },
    { id: 'student-requests', label: 'Student Requests', component: StudentRequests },
    { id: 'route-requests', label: 'Route Requests', component: RouteRequests },
]

export const isRequestsSubTab = (sectionId: string): sectionId is RequestsSubTabType => {
    return REQUESTS_SUB_TABS.some((tab) => tab.id === sectionId)
}
