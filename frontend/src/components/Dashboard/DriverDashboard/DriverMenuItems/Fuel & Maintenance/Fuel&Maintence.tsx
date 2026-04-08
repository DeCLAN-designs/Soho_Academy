import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import {
    fuelMaintenanceApi,
    type CreateFuelMaintenanceRequestPayload,
    type FuelMaintenanceCategory,
    type FuelMaintenanceRequestRecord,
    type FuelMaintenanceRequestType,
} from '../../../../../lib/api'
import { useAuth } from '../../../../../contexts/AuthContext'
import Loader from '../../../../Loader/Loader'
import './Fuel&Maintence.css'

type FuelMaintenanceFormState = {
    requestDate: string
    requestTime: string
    numberPlate: string
    currentMileage: string
    requestType: FuelMaintenanceRequestType
    requestedBy: string
    category: FuelMaintenanceCategory
    description: string
    amount: string
    confirmedBy: string
}

type FuelMaintenanceView = 'history' | 'request'

const REQUEST_TYPES: FuelMaintenanceRequestType[] = [
    'Fuel',
    'Service',
    'Repair and Maintenance',
    'Compliance',
]

const CATEGORIES: FuelMaintenanceCategory[] = [
    'Fuels & Oils',
    'Body Works and Body Parts',
    'Mechanical',
    'Wiring',
    'Puncture & Tires',
    'Insurance',
    'RSL',
    'Inspection / Speed Governors',
]

const today = () => new Date().toISOString().slice(0, 10)

const currentTime = () => {
    const now = new Date()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
}

const createInitialFormState = (): FuelMaintenanceFormState => ({
    requestDate: today(),
    requestTime: currentTime(),
    numberPlate: '',
    currentMileage: '',
    requestType: 'Fuel',
    requestedBy: '',
    category: 'Fuels & Oils',
    description: '',
    amount: '',
    confirmedBy: '',
})

const formatDate = (value: string) => {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return value
    }

    return date.toLocaleDateString()
}

const formatDisplayTime = (value: string) => {
    if (!value) {
        return ''
    }

    return value.slice(0, 5)
}

const formatDateTime = (date: string, time: string) => {
    const formattedDate = formatDate(date)
    const formattedTime = formatDisplayTime(time)

    return [formattedDate, formattedTime].filter(Boolean).join(' at ')
}

const DriverFuelMaintenanceMenuItem = () => {
    const { user } = useAuth()
    const [activeView, setActiveView] = useState<FuelMaintenanceView>('request')
    const [form, setForm] = useState<FuelMaintenanceFormState>(createInitialFormState())
    const [historyRequests, setHistoryRequests] = useState<FuelMaintenanceRequestRecord[]>([])
    const [isLoadingHistory, setIsLoadingHistory] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [successMessage, setSuccessMessage] = useState('')

    const assignedNumberPlate = user?.numberPlate || ''
    const loggedInDriverName = [user?.firstName, user?.lastName]
        .filter((namePart) => Boolean(namePart && namePart.trim()))
        .join(' ')
        .trim()
    const needsAmount = form.requestType === 'Fuel'

    const loadHistory = async (withLoader = true) => {
        if (withLoader) {
            setIsLoadingHistory(true)
        }

        setErrorMessage('')

        try {
            const response = await fuelMaintenanceApi.getRequests()
            setHistoryRequests(response.data?.requests || [])
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to load fuel history.')
        } finally {
            if (withLoader) {
                setIsLoadingHistory(false)
            }
        }
    }

    useEffect(() => {
        void loadHistory(true)
    }, [])

    useEffect(() => {
        setForm((currentFormState) => ({
            ...currentFormState,
            numberPlate: assignedNumberPlate,
            requestedBy: loggedInDriverName,
        }))
    }, [assignedNumberPlate, loggedInDriverName])

    const handleChange = (
        event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = event.target

        setForm((currentFormState) => ({
            ...currentFormState,
            [name]: value,
        }))
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setErrorMessage('')
        setSuccessMessage('')

        if (needsAmount && !form.amount.trim()) {
            setErrorMessage('Amount is required for Fuel requests.')
            return
        }

        if (!assignedNumberPlate) {
            setErrorMessage('No number plate is assigned to this driver account.')
            return
        }

        setIsSubmitting(true)

        try {
            const payload: CreateFuelMaintenanceRequestPayload = {
                requestDate: form.requestDate,
                requestTime: form.requestTime,
                numberPlate: assignedNumberPlate,
                currentMileage: Number(form.currentMileage),
                requestType: form.requestType,
                category: form.category,
                description: form.description.trim(),
                confirmedBy: form.confirmedBy.trim(),
                ...(needsAmount ? { amount: Number(form.amount) } : {}),
            }

            await fuelMaintenanceApi.createRequest(payload)

            setErrorMessage('')
            setSuccessMessage('Fuel and maintenance request saved successfully.')
            setForm({
                ...createInitialFormState(),
                numberPlate: assignedNumberPlate,
                requestedBy: loggedInDriverName,
            })
            await loadHistory(false)
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to save request.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <section className="driverMenuFuelMaintenance">
            <div className="driverMenuFuelMaintenance__tabs">
                <button
                    type="button"
                    className={
                        activeView === 'request'
                            ? 'driverMenuFuelMaintenance__tab driverMenuFuelMaintenance__tab--active'
                            : 'driverMenuFuelMaintenance__tab'
                    }
                    onClick={() => setActiveView('request')}
                >
                    Fuel & Maintenance Request
                </button>
                <button
                    type="button"
                    className={
                        activeView === 'history'
                            ? 'driverMenuFuelMaintenance__tab driverMenuFuelMaintenance__tab--active'
                            : 'driverMenuFuelMaintenance__tab'
                    }
                    onClick={() => setActiveView('history')}
                >
                    Fuel History
                </button>
            </div>

            {activeView === 'history' ? (
                <div className="driverMenuFuelMaintenance__history">
                    <div className="driverMenuFuelMaintenance__historyHeader">
                        <div>
                            <h3 className="driverMenuFuelMaintenance__title">Fuel History</h3>
                            <p className="driverMenuFuelMaintenance__description">
                                Review previously submitted fuel and maintenance requests with
                                their recorded date and time.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="driverMenuFuelMaintenance__ghostButton"
                            onClick={() => void loadHistory(true)}
                            disabled={isLoadingHistory}
                        >
                            {isLoadingHistory ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>

                    {isLoadingHistory ? (
                        <Loader variant="section" label="Loading request history" />
                    ) : null}

                    {!isLoadingHistory && historyRequests.length === 0 ? (
                        <p className="driverMenuFuelMaintenance__description">No fuel and maintenance requests found.</p>
                    ) : null}

                    {!isLoadingHistory && historyRequests.length > 0 ? (
                        <ul className="driverMenuFuelMaintenance__historyList">
                            {historyRequests.map((requestRecord) => (
                                <li key={requestRecord.id} className="driverMenuFuelMaintenance__historyItem">
                                    <div className="driverMenuFuelMaintenance__historyTop">
                                        <div>
                                            <strong>{requestRecord.requestedBy}</strong>
                                            <span>
                                                {formatDateTime(
                                                    requestRecord.requestDate,
                                                    requestRecord.requestTime
                                                )}
                                            </span>
                                        </div>

                                        <span className="driverMenuFuelMaintenance__badge">
                                            {requestRecord.numberPlate}
                                        </span>
                                    </div>

                                    <div className="driverMenuFuelMaintenance__metaGrid">
                                        <div>
                                            <h4>Request Type</h4>
                                            <p>{requestRecord.requestType}</p> 
                                        </div>

                                        <div>
                                            <h4>Category</h4>
                                            <p>{requestRecord.category}</p>
                                        </div>

                                        <div>
                                            <h4>Mileage</h4>
                                            <p>{requestRecord.currentMileage}</p>
                                        </div>

                                        <div>
                                            <h4>Confirmed By</h4>
                                            <p>{requestRecord.confirmedBy}</p>
                                        </div>

                                        {requestRecord.amount !== null ? (
                                            <div>
                                                <h4>Amount</h4>
                                                <p>{requestRecord.amount}</p>
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="driverMenuFuelMaintenance__detailBlock">
                                        <h4>Description</h4>
                                        <p>{requestRecord.description}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </div>
            ) : (
                <>
                    <div className="driverMenuFuelMaintenance__intro">
                        <div>
                            <h3 className="driverMenuFuelMaintenance__title">Fuel & Maintenance Request</h3>
                            <p className="driverMenuFuelMaintenance__description">
                                Submit fuel, service, repair and maintenance, or compliance
                                requests with full details.
                            </p>
                        </div>

                        <div className="driverMenuFuelMaintenance__plateCard">
                            <span>Assigned Bus</span>
                            <strong>{assignedNumberPlate || 'Not assigned'}</strong>
                        </div>
                    </div>

                    <form className="driverMenuFuelMaintenance__form" onSubmit={handleSubmit}>
                        <div className="driverMenuFuelMaintenance__grid">
                            <label>
                                Requested By
                                <input
                                    type="text"
                                    name="requestedBy"
                                    value={form.requestedBy}
                                    readOnly
                                />
                            </label>

                            <label>
                                Date
                                <input
                                    type="date"
                                    name="requestDate"
                                    value={form.requestDate}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                    required
                                />
                            </label>

                            <label>
                                Time
                                <input
                                    type="time"
                                    name="requestTime"
                                    value={form.requestTime}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                    required
                                />
                            </label>

                            <label>
                                Current Mileage
                                <input
                                    type="number"
                                    min={0}
                                    step={1}
                                    name="currentMileage"
                                    value={form.currentMileage}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                    placeholder="e.g. 143250"
                                    required
                                />
                            </label>

                            <label>
                                Request Type
                                <select
                                    name="requestType"
                                    value={form.requestType}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                    required
                                >
                                    {REQUEST_TYPES.map((requestType) => (
                                        <option key={requestType} value={requestType}>
                                            {requestType}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                Category
                                <select
                                    name="category"
                                    value={form.category}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                    required
                                >
                                    {CATEGORIES.map((categoryOption) => (
                                        <option key={categoryOption} value={categoryOption}>
                                            {categoryOption}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="driverMenuFuelMaintenance__fullWidth">
                                Description (Detailed)
                                <textarea
                                    name="description"
                                    value={form.description}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                    placeholder="Provide detailed request information"
                                    rows={4}
                                    required
                                />
                            </label>

                            <label>
                                Amount {needsAmount ? '(Required for Fuel)' : '(Optional)'}
                                <input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    name="amount"
                                    value={form.amount}
                                    onChange={handleChange}
                                    disabled={isSubmitting || !needsAmount}
                                    placeholder={needsAmount ? 'e.g. 12000.00' : 'Only required for Fuel'}
                                    required={needsAmount}
                                />
                            </label>

                            <label>
                                Confirmed By
                                <input
                                    type="text"
                                    name="confirmedBy"
                                    value={form.confirmedBy}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                    placeholder="Enter approver or confirmer name"
                                    maxLength={255}
                                    required
                                />
                            </label>
                        </div>

                        <button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving Request...' : 'Submit Request'}
                        </button>

                        {isSubmitting ? <Loader variant="inline" label="Saving request" /> : null}
                    </form>
                </>
            )}

            {errorMessage ? <p className="driverMenuFuelMaintenance__status driverMenuFuelMaintenance__status--error">{errorMessage}</p> : null}
            {successMessage ? <p className="driverMenuFuelMaintenance__status driverMenuFuelMaintenance__status--success">{successMessage}</p> : null}
        </section>
    )
}

export default DriverFuelMaintenanceMenuItem
