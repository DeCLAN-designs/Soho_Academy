import type { ComponentType } from 'react'
import type { RoleSection } from '../../../dashboard.types'
import { Vehicles, VehicleAssignments, FuelManagement, Maintenance, VehicleDocuments } from './Tabs'

export type FleetSubTabType = 'vehicles' | 'vehicle-assignments' | 'fuel-management' | 'maintenance' | 'vehicle-documents'

type FleetSubTab = {
    id: FleetSubTabType
    label: string
    component: ComponentType<{ section: RoleSection }>
}

export const FLEET_SUB_TABS: FleetSubTab[] = [
    { id: 'vehicles', label: 'Vehicles', component: Vehicles },
    { id: 'vehicle-assignments', label: 'Vehicle Assignments', component: VehicleAssignments },
    { id: 'fuel-management', label: 'Fuel Management', component: FuelManagement },
    { id: 'maintenance', label: 'Maintenance', component: Maintenance },
    { id: 'vehicle-documents', label: 'Vehicle Documents', component: VehicleDocuments },
]

export const isFleetSubTab = (sectionId: string): sectionId is FleetSubTabType => {
    return FLEET_SUB_TABS.some((tab) => tab.id === sectionId)
}
