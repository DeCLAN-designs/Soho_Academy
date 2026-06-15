import type { ComponentType } from 'react'
import type { RoleSection } from '../../../dashboard.types'
import { Announcements, ParentNotifications, InternalMessaging } from './Tabs'

export type CommunicationSubTabType = 'announcements' | 'parent-notifications' | 'internal-messaging'

type CommunicationSubTab = {
    id: CommunicationSubTabType
    label: string
    component: ComponentType<{ section: RoleSection }>
}

export const COMMUNICATION_SUB_TABS: CommunicationSubTab[] = [
    { id: 'announcements', label: 'Announcements', component: Announcements },
    { id: 'parent-notifications', label: 'Parent Notifications', component: ParentNotifications },
    { id: 'internal-messaging', label: 'Internal Messaging', component: InternalMessaging },
]

export const isCommunicationSubTab = (sectionId: string): sectionId is CommunicationSubTabType => {
    return COMMUNICATION_SUB_TABS.some((tab) => tab.id === sectionId)
}
