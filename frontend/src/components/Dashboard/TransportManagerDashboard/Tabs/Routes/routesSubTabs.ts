import type { ComponentType } from 'react'
import type { RoleSection } from '../../../dashboard.types'
import { RoutePlanning, StopsManagement, RouteMonitoring, RouteOptimization } from './Tabs'

export type RoutesSubTabType = 'route-planning' | 'stops' | 'route-monitoring' | 'optimization'

type RoutesSubTab = {
    id: RoutesSubTabType
    label: string
    component: ComponentType<{ section: RoleSection }>
}

export const ROUTES_SUB_TABS: RoutesSubTab[] = [
    { id: 'route-planning', label: 'Route Planning', component: RoutePlanning },
    { id: 'stops', label: 'Stops', component: StopsManagement },
    { id: 'route-monitoring', label: 'Route Monitoring', component: RouteMonitoring },
    { id: 'optimization', label: 'Optimization', component: RouteOptimization },
]

export const isRoutesSubTab = (sectionId: string): sectionId is RoutesSubTabType => {
    return ROUTES_SUB_TABS.some((tab) => tab.id === sectionId)
}
