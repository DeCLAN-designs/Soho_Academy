import re

dashboard_path = "src/components/Dashboard/TransportManagerDashboard/TransportManagerDashboard.tsx"
fuel_req_path = "src/components/Dashboard/TransportManagerDashboard/Tabs/Requests/Tabs/FuelRequests.tsx"

with open(dashboard_path, "r") as f:
    dashboard_content = f.read()

# Replace invalid import
dashboard_content = dashboard_content.replace(
    "import type { TransportManagerDashboardProps, TabComponentProps } from '../dashboard.types'",
    "import type { DashboardRoleConfig } from '../dashboard.types'"
)

# Insert the local types below the imports
type_definitions = """
interface TransportManagerDashboardProps {
    activeSection?: string
}

export interface TabComponentProps {
    section: DashboardRoleConfig['sections'][string]
    activeSection: string
}
"""
dashboard_content = dashboard_content.replace(
    "import './TransportManagerDashboard.css'\n",
    "import './TransportManagerDashboard.css'\n" + type_definitions
)

with open(dashboard_path, "w") as f:
    f.write(dashboard_content)

with open(fuel_req_path, "r") as f:
    fuel_content = f.read()

# Fix the dashboardData null issue
fuel_content = fuel_content.replace(
    "    return (\n        <div>\n            {successMessage",
    "    if (!dashboardData) return null;\n\n    return (\n        <div>\n            {successMessage"
)

with open(fuel_req_path, "w") as f:
    f.write(fuel_content)

