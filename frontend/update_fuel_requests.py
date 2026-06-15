import re

dashboard_path = "src/components/Dashboard/TransportManagerDashboard/TransportManagerDashboard.tsx"
fuel_req_path = "src/components/Dashboard/TransportManagerDashboard/Tabs/Requests/Tabs/FuelRequests.tsx"

with open(dashboard_path, "r") as f:
    content = f.read()

# Extract FuelMaintenance UI block
ui_block_match = re.search(r'(<div className="fuelMaintenanceSection">.*?(?=</div>\s*</div>))</div>', content, re.DOTALL)
if not ui_block_match:
    print("Could not find UI block")
    ui_block = ""
else:
    ui_block = ui_block_match.group(1)

# Generate FuelRequests.tsx content
fuel_requests_content = f"""import React, {{ useEffect, useState }} from 'react'
import type {{ FormEvent }} from 'react'
import {{ fuelMaintenanceApi, type FuelMaintenanceRequestRecord }} from '../../../../../../lib/api'
import Loader from '../../../../../Loader/Loader'

type DashboardData = {{
    pendingRequests: FuelMaintenanceRequestRecord[]
    confirmedRequests: FuelMaintenanceRequestRecord[]
    rejectedRequests: FuelMaintenanceRequestRecord[]
}}

const FuelRequests = () => {{
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [selectedRequest, setSelectedRequest] = useState<FuelMaintenanceRequestRecord | null>(null)
    const [isConfirming, setIsConfirming] = useState(false)
    const [confirmationStatus, setConfirmationStatus] = useState('CONFIRMED')
    const [errorMessage, setErrorMessage] = useState('')
    const [successMessage, setSuccessMessage] = useState('')

    const fetchData = async () => {{
        try {{
            setIsLoading(true)
            setErrorMessage('')

            const fuelResponse = await fuelMaintenanceApi.getRequests()
            const requests = fuelResponse.data?.requests || []

            const dashboardInfo: DashboardData = {{
                pendingRequests: requests.filter((r: FuelMaintenanceRequestRecord) => r.status === 'Pending'),
                confirmedRequests: requests.filter((r: FuelMaintenanceRequestRecord) => r.status === 'Approved'),
                rejectedRequests: requests.filter((r: FuelMaintenanceRequestRecord) => r.status === 'Rejected'),
            }}

            setDashboardData(dashboardInfo)
        }} catch (error) {{
            setErrorMessage('Failed to load dashboard data. Please try again.')
            console.error('Dashboard data error:', error)
        }} finally {{
            setIsLoading(false)
        }}
    }}

    useEffect(() => {{
        fetchData()
    }}, [])

    const handleConfirmRequest = async (e: FormEvent) => {{
        e.preventDefault()
        if (!selectedRequest) return

        setIsConfirming(true)
        setErrorMessage('')
        setSuccessMessage('')

        try {{
            await fuelMaintenanceApi.updateRequestStatus(selectedRequest.id, {{
                status: confirmationStatus === 'CONFIRMED' ? 'Approved' : 'Rejected',
            }})

            setSuccessMessage('Request successfully processed')
            setSelectedRequest(null)
            
            // Refresh data
            fetchData()

            // Clear success message after 3 seconds
            setTimeout(() => setSuccessMessage(''), 3000)
        }} catch (error) {{
            setErrorMessage('Failed to process request. Please try again.')
            console.error('Confirmation error:', error)
        }} finally {{
            setIsConfirming(false)
        }}
    }}

    if (isLoading) {{
        return <Loader variant="full" label="Loading fuel requests..." />
    }}

    if (errorMessage && !dashboardData) {{
        return (
            <div className="errorContainer">
                <p className="errorMessage">{{errorMessage}}</p>
                <button onClick={{fetchData}} className="retryButton">Retry</button>
            </div>
        )
    }}

    return (
        <div>
            {{successMessage && <div className="successBanner">{{successMessage}}</div>}}
            {{errorMessage && dashboardData && <div className="errorBanner">{{errorMessage}}</div>}}
            {ui_block}
        </div>
    )
}}

export default FuelRequests
"""

with open(fuel_req_path, "w") as f:
    f.write(fuel_requests_content)

print("Created FuelRequests.tsx")
