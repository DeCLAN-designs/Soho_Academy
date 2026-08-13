import type { DashboardRoleConfig } from '../dashboard.types'

export const fuelManagerDashboardConfig: DashboardRoleConfig = {
  title: 'Fuel Manager Dashboard',
  subtitle: 'Manage fuel requests, logs, and vehicle fuel consumption.',
  quickActions: ['Approve Requests', 'View Fuel Logs', 'Monitor Consumption'],
  navigation: [
    {
      id: 'dashboard',
      label: 'Dashboard',
    },
    {
      id: 'fuel-requests',
      label: 'Fuel Requests',
    },
    {
      id: 'fuel-approvals',
      label: 'Fuel Approvals',
    },
    {
      id: 'fuel-logs',
      label: 'Fuel Logs',
    },
    {
      id: 'analytics',
      label: 'Analytics',
    },
    {
      id: 'mileage-anomalies',
      label: 'Mileage Anomalies',
    },
  ],
  sections: {
    dashboard: {
      heading: 'Operations Overview',
      description: 'Get a high-level view of fuel operations.',
      cards: ['Total fuel requests', 'Pending approvals', 'Today\'s fuel logs'],
    },
    'fuel-requests': {
      heading: 'Fuel Requests',
      description: 'View and manage all fuel and maintenance requests.',
      cards: ['Fuel requests', 'Maintenance requests', 'Request history'],
    },
    'fuel-approvals': {
      heading: 'Fuel Approvals',
      description: 'Review and approve or reject pending fuel requests.',
      cards: ['Pending approvals', 'Recent approvals', 'Approval history'],
    },
    'fuel-logs': {
      heading: 'Fuel Logs',
      description: 'View and manage fuel fill-up logs and consumption data.',
      cards: ['Fuel logs', 'Consumption data', 'Fill-up history'],
    },
    analytics: {
      heading: 'Analytics',
      description: 'Analyze fuel consumption trends and costs.',
      cards: ['Cost trends', 'Vehicle breakdown', 'Monthly analysis'],
    },
    'mileage-anomalies': {
      heading: 'Mileage Anomalies',
      description: 'Monitor vehicles with unusual fuel consumption patterns.',
      cards: ['High risk', 'Medium risk', 'Low risk'],
    },
  },
  role: 'Fuel Manager',
  roleSlug: 'fuel-manager',
}
