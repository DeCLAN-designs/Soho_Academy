// Tabs/index.ts
import { lazy } from 'react'

// Lazy load all tabs for better performance
export const DashboardTab       = lazy(() => import('./Dashboard'))
export const FleetTab           = lazy(() => import('./Fleet'))
export const RoutesTab          = lazy(() => import('./Routes'))
export const StudentsTab        = lazy(() => import('./Students'))
export const StaffTab           = lazy(() => import('./Staff'))
export const SafetyIncidentsTab = lazy(() => import('./SafetyIncidents'))
export const RequestsTab        = lazy(() => import('./Requests'))
export const CommunicationTab   = lazy(() => import('./Communication'))
export const ReportsTab         = lazy(() => import('./Reports'))
export const AuditLogsTab       = lazy(() => import('./AuditLogs'))
export const SettingsTab        = lazy(() => import('./Settings'))

// Optional: Preload frequently used tabs
export const preloadStudentsTab = () => {
    const prefetchLink = document.createElement('link');
    prefetchLink.rel = 'prefetch';
    prefetchLink.as = 'script';
    prefetchLink.href = import.meta.env.DEV 
        ? '/src/Dashboard/Tabs/Students.tsx' 
        : '/assets/Students-[hash].js';
    document.head.appendChild(prefetchLink);
};