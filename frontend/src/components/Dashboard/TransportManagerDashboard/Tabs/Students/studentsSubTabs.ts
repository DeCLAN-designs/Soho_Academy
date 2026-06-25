// studentsSubTabs.ts
import { lazy } from 'react';

export const STUDENTS_SUB_TABS = [
    {
        id: 'assignments',
        label: 'Assignments',
        component: lazy(() => import('./Tabs/Assignments'))
    },
    {
        id: 'attendance',
        label: 'Attendance',
        component: lazy(() => import('./Tabs/StudentAttendance'))
    },
    {
        id: 'change-requests',
        label: 'Change Requests',
        component: lazy(() => import('./Tabs/ChangeRequests'))
    }
];

export const isStudentsSubTab = (section: string): boolean => {
    return STUDENTS_SUB_TABS.some(tab => tab.id === section);
};