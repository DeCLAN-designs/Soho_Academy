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
import './Fuel&Maintence.css'

type FuelMaintenanceFormState = {
    requestDate: string
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

const CONFIRMED_BY_OPTIONS = ['Erick', 'Douglas', 'James'] as const

const today = () => new Date().toISOString().slice(0, 10)

const createInitialFormState = (): FuelMaintenanceFormState => ({
    requestDate: today(),
    numberPlate: '',
    currentMileage: '',
    requestType: 'Fuel',
    requestedBy: '',
    category: 'Fuels & Oils',
    description: '',
    amount: '',
    confirmedBy: CONFIRMED_BY_OPTIONS[0],
})

const formatDate = (value: string) => {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return value
    }

    return date.toLocaleDateString()
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
    const needsAmount = form.requestType === 'Fuel'

    const loadHistory = async (withLoader = true) => {
        if (withLoader) {
            setIsLoadingHistory(true)
        }

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
        }))
    }, [assignedNumberPlate])

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
                numberPlate: assignedNumberPlate,
                currentMileage: Number(form.currentMileage),
                requestType: form.requestType,
                requestedBy: form.requestedBy.trim(),
                category: form.category,
                description: form.description.trim(),
                confirmedBy: form.confirmedBy.trim(),
                ...(needsAmount ? { amount: Number(form.amount) } : {}),
            }

            await fuelMaintenanceApi.createRequest(payload)

            setSuccessMessage('Fuel and maintenance request saved successfully.')
            setForm({
                ...createInitialFormState(),
                numberPlate: assignedNumberPlate,
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
                        activeView === 'history'
                            ? 'driverMenuFuelMaintenance__tab driverMenuFuelMaintenance__tab--active'
                            : 'driverMenuFuelMaintenance__tab'
                    }
                    onClick={() => setActiveView('history')}
                >
                    Fuel History
                </button>
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
            </div>

            {activeView === 'history' ? (
                <div className="driverMenuFuelMaintenance__history">
                    <h3 className="driverMenuFuelMaintenance__title">Fuel History</h3>
                    {isLoadingHistory ? (
                        <p className="driverMenuFuelMaintenance__description">Loading request history...</p>
                    ) : null}

                    {!isLoadingHistory && historyRequests.length === 0 ? (
                        <p className="driverMenuFuelMaintenance__description">No fuel and maintenance requests found.</p>
                    ) : null}

                    {!isLoadingHistory && historyRequests.length > 0 ? (
                        <ul className="driverMenuFuelMaintenance__historyList">
                            {historyRequests.map((requestRecord) => (
                                <li key={requestRecord.id} className="driverMenuFuelMaintenance__historyItem">
                                    <div>
                                        <strong>{requestRecord.numberPlate}</strong>
                                        <span>{formatDate(requestRecord.requestDate)} - {requestRecord.requestType}</span>
                                    </div>
                                    <div>
                                        <span>Category: {requestRecord.category}</span>
                                        <span>Mileage: {requestRecord.currentMileage}</span>
                                        <span>Requested By: {requestRecord.requestedBy}</span>
                                        <span>Confirmed By: {requestRecord.confirmedBy}</span>
                                        {requestRecord.amount !== null ? <span>Amount: {requestRecord.amount}</span> : null}
                                    </div>
                                    <p>{requestRecord.description}</p>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </div>
            ) : (
                <>
                    <h3 className="driverMenuFuelMaintenance__title">Fuel & Maintenance Request</h3>
                    <p className="driverMenuFuelMaintenance__description">
                        Submit fuel, service, repair and maintenance, or compliance requests with full details.
                    </p>

                    <form className="driverMenuFuelMaintenance__form" onSubmit={handleSubmit}>
                        <div className="driverMenuFuelMaintenance__grid">
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
                                Number Plate
                                <input
                                    type="text"
                                    value={assignedNumberPlate || 'No assigned number plate'}
                                    disabled
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
                                Requested By
                                <input
                                    type="text"
                                    name="requestedBy"
                                    value={form.requestedBy}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                    placeholder="Name of requester"
                                    maxLength={255}
                                    required
                                />
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

                            <label className="driverMenuFuelMaintenance__amountField">
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
                                <select
                                    name="confirmedBy"
                                    value={form.confirmedBy}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                    required
                                >
                                    {CONFIRMED_BY_OPTIONS.map((approverName) => (
                                        <option key={approverName} value={approverName}>
                                            {approverName}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving Request...' : 'Submit Request'}
                        </button>
                    </form>
                </>
            )}

            {errorMessage ? <p className="driverMenuFuelMaintenance__status driverMenuFuelMaintenance__status--error">{errorMessage}</p> : null}
            {successMessage ? <p className="driverMenuFuelMaintenance__status driverMenuFuelMaintenance__status--success">{successMessage}</p> : null}
        </section>
    )
}

export default DriverFuelMaintenanceMenuItem
