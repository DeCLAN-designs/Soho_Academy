import type { ComponentType } from 'react'
import type { RoleSection } from '../../../dashboard.types'
import { IncidentReports, EmergencyManagement, SafetyAudits, Violations } from './Tabs'

export type SafetyIncidentsSubTabType = 'incident-reports' | 'emergency-management' | 'safety-audits' | 'violations'

type SafetyIncidentsSubTab = {
    id: SafetyIncidentsSubTabType
    label: string
    component: ComponentType<{ section: RoleSection }>
}

export const SAFETY_INCIDENTS_SUB_TABS: SafetyIncidentsSubTab[] = [
    { id: 'incident-reports', label: 'Incident Reports', component: IncidentReports },
    { id: 'emergency-management', label: 'Emergency Management', component: EmergencyManagement },
    { id: 'safety-audits', label: 'Safety Audits', component: SafetyAudits },
    { id: 'violations', label: 'Violations', component: Violations },
]

export const isSafetyIncidentsSubTab = (sectionId: string): sectionId is SafetyIncidentsSubTabType => {
    return SAFETY_INCIDENTS_SUB_TABS.some((tab) => tab.id === sectionId)
}
