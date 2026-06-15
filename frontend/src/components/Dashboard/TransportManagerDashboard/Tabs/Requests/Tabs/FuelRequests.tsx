import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { fuelMaintenanceApi, type FuelMaintenanceRequestRecord } from '../../../../../../lib/api'
import Loader from '../../../../../Loader/Loader'

type DashboardData = {
    pendingRequests: FuelMaintenanceRequestRecord[]
    confirmedRequests: FuelMaintenanceRequestRecord[]
    rejectedRequests: FuelMaintenanceRequestRecord[]
}

const FuelRequests = () => {
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [selectedRequest, setSelectedRequest] = useState<FuelMaintenanceRequestRecord | null>(null)
    const [isConfirming, setIsConfirming] = useState(false)
    const [confirmationStatus, setConfirmationStatus] = useState('CONFIRMED')
    const [errorMessage, setErrorMessage] = useState('')
    const [successMessage, setSuccessMessage] = useState('')

    const fetchData = async () => {
        try {
            setIsLoading(true)
            setErrorMessage('')

            const fuelResponse = await fuelMaintenanceApi.getRequests()
            const requests = fuelResponse.data?.requests || []

            const dashboardInfo: DashboardData = {
                pendingRequests: requests.filter((r: FuelMaintenanceRequestRecord) => r.status === 'Pending'),
                confirmedRequests: requests.filter((r: FuelMaintenanceRequestRecord) => r.status === 'Approved'),
                rejectedRequests: requests.filter((r: FuelMaintenanceRequestRecord) => r.status === 'Rejected'),
            }

            setDashboardData(dashboardInfo)
        } catch (error) {
            setErrorMessage('Failed to load dashboard data. Please try again.')
            console.error('Dashboard data error:', error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleConfirmRequest = async (e: FormEvent) => {
        e.preventDefault()
        if (!selectedRequest) return

        setIsConfirming(true)
        setErrorMessage('')
        setSuccessMessage('')

        try {
            await fuelMaintenanceApi.updateRequestStatus(selectedRequest.id, {
                status: confirmationStatus === 'CONFIRMED' ? 'Approved' : 'Rejected',
            })

            setSuccessMessage('Request successfully processed')
            setSelectedRequest(null)
            
            // Refresh data
            fetchData()

            // Clear success message after 3 seconds
            setTimeout(() => setSuccessMessage(''), 3000)
        } catch (error) {
            setErrorMessage('Failed to process request. Please try again.')
            console.error('Confirmation error:', error)
        } finally {
            setIsConfirming(false)
        }
    }

    if (isLoading) {
        return <Loader variant="section" label="Loading fuel requests..." />
    }

    if (errorMessage && !dashboardData) {
        return (
            <div className="errorContainer">
                <p className="errorMessage">{errorMessage}</p>
                <button onClick={fetchData} className="retryButton">Retry</button>
            </div>
        )
    }

    if (!dashboardData) return null;

    return (
        <div>
            {successMessage && <div className="successBanner">{successMessage}</div>}
            {errorMessage && dashboardData && <div className="errorBanner">{errorMessage}</div>}
                            <div className="fuelMaintenanceSection">
                    <div className="requestsList">
                        <h3>Pending Requests</h3>

                        {dashboardData.pendingRequests.length === 0 ? (
                            <p className="emptyState">No pending fuel/maintenance requests</p>
                        ) : (
                            <div className="requestsTable">
                                {dashboardData.pendingRequests.map((request) => (
                                    <div
                                        key={request.id}
                                        className={`requestCard ${
                                            selectedRequest?.id === request.id ? 'selected' : ''
                                        }`}
                                        onClick={() => setSelectedRequest(request)}
                                    >
                                        <div className="requestHeader">
                                            <strong>{request.numberPlate}</strong>
                                            <span className="requestType">{request.requestType}</span>
                                        </div>
                                        <div className="requestBody">
                                            <p>
                                                <strong>From:</strong> {request.requestedBy}
                                            </p>
                                            <p>
                                                <strong>Category:</strong> {request.category}
                                            </p>
                                            <p>
                                                <strong>Description:</strong> {request.description}
                                            </p>
                                            {request.amount && (
                                                <p>
                                                    <strong>Amount:</strong> ${request.amount.toFixed(2)}
                                                </p>
                                            )}
                                            <p className="date">
                                                {new Date(request.requestDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {selectedRequest && (
                        <div className="confirmationPanel">
                            <h3>Confirm Request</h3>
                            <form onSubmit={handleConfirmRequest}>
                                <div className="formGroup">
                                    <label htmlFor="confirmationStatus">Confirmation Status</label>
                                    <select
                                        id="confirmationStatus"
                                        value={confirmationStatus}
                                        onChange={(e) => setConfirmationStatus(e.target.value)}
                                        disabled={isConfirming}
                                    >
                                        <option value="CONFIRMED">Confirm Request</option>
                                        <option value="REJECTED">Reject Request</option>
                                    </select>
                                </div>

                                <div className="requestDetails">
                                    <h4>Request Details</h4>
                                    <p>
                                        <strong>Vehicle:</strong> {selectedRequest.numberPlate}
                                    </p>
                                    <p>
                                        <strong>Type:</strong> {selectedRequest.requestType}
                                    </p>
                                    <p>
                                        <strong>Category:</strong> {selectedRequest.category}
                                    </p>
                                    <p>
                                        <strong>Description:</strong> {selectedRequest.description}
                                    </p>
                                    {selectedRequest.amount && (
                                        <p>
                                            <strong>Amount:</strong> ${selectedRequest.amount.toFixed(2)}
                                        </p>
                                    )}
                                    <p>
                                        <strong>Mileage:</strong> {selectedRequest.currentMileage} km
                                    </p>
                                    <p>
                                        <strong>Submitted by:</strong> {selectedRequest.requestedBy}
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isConfirming}
                                    className="submitButton"
                                >
                                    {isConfirming
                                        ? 'Processing...'
                                        : `${confirmationStatus === 'CONFIRMED' ? 'Confirm' : 'Reject'} Request`}
                                </button>
                            </form>
                        </div>
                    )}

                    {dashboardData.confirmedRequests.length > 0 && (
                        <div className="confirmedRequestsList">
                            <h3>Recently Confirmed Requests</h3>
                            <div className="requestsTable">
                                {dashboardData.confirmedRequests.slice(0, 5).map((request) => (
                                    <div key={request.id} className="requestCard">
                                        <div className="requestHeader">
                                            <strong>{request.numberPlate}</strong>
                                            <span className="confirmed">Confirmed</span>
                                        </div>
                                        <div className="requestBody">
                                            <p>
                                                <strong>Confirmed by:</strong>{' '}
                                                {request.confirmedBy || 'Unknown'}
                                            </p>
                                            <p>
                                                <strong>Confirmed at:</strong>{' '}
                                                {request.updatedAt
                                                    ? new Date(request.updatedAt).toLocaleString()
                                                    : 'N/A'}
                                            </p>
                                            <p>
                                                <strong>Category:</strong> {request.category}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

        </div>
    )
}

export default FuelRequests
