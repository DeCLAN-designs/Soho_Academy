import type { ComponentType } from 'react'
import type { RoleSection } from '../../../dashboard.types'
import { RoutePlanning, StopsManagement, RouteMonitoring, RouteOptimization, TransportCalendar, TripSimulation } from './Tabs'

export type RoutesSubTabType =
    | 'route-planning'
    | 'stops'
    | 'route-monitoring'
    | 'optimization'
    | 'transport-calendar'
    | 'trip-simulation'

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
    { id: 'transport-calendar', label: 'Transport Calendar', component: TransportCalendar },
    { id: 'trip-simulation', label: 'Trip Simulation', component: TripSimulation },
]

export const isRoutesSubTab = (sectionId: string): sectionId is RoutesSubTabType => {
    return ROUTES_SUB_TABS.some((tab) => tab.id === sectionId)
}
