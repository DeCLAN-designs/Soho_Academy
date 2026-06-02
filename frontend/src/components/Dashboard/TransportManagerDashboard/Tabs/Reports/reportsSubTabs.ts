import type { ComponentType } from 'react'
import type { RoleSection } from '../../../dashboard.types'
import { OperationalReports, FinancialReports, StaffReports, ComplianceReports } from './Tabs'

export type ReportsSubTabType = 'operational-reports' | 'financial-reports' | 'staff-reports' | 'compliance-reports'

type ReportsSubTab = {
    id: ReportsSubTabType
    label: string
    component: ComponentType<{ section: RoleSection }>
}

export const REPORTS_SUB_TABS: ReportsSubTab[] = [
    { id: 'operational-reports', label: 'Operational Reports', component: OperationalReports },
    { id: 'financial-reports', label: 'Financial Reports', component: FinancialReports },
    { id: 'staff-reports', label: 'Staff Reports', component: StaffReports },
    { id: 'compliance-reports', label: 'Compliance Reports', component: ComplianceReports },
]

export const isReportsSubTab = (sectionId: string): sectionId is ReportsSubTabType => {
    return REPORTS_SUB_TABS.some((tab) => tab.id === sectionId)
}
