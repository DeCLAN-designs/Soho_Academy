import React, { useEffect, useMemo, useState } from 'react'
import ReactDOM from 'react-dom'
import type { RoleSection } from '../../../../dashboard.types'
import './TransportCalendar.css'

interface TransportCalendarProps {
    section: RoleSection
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type AcademicYear = { id: number; name: string; start_date: string; end_date: string }
type Term = { id: number; academic_year_id: number; name: string; start_date: string; end_date: string; transport_enabled: boolean }
type CalendarEvent = { id?: number; academic_year_id?: number; academic_term_id?: number; name: string; event_type: string; start_date: string; end_date: string; transport_enabled: boolean; description?: string }

const fallbackEvents = [
    { id: 1, date: '2026-07-07', title: 'Mid-Term Break', status: 'No Transport' },
    { id: 2, date: '2026-07-18', title: 'Make-up Saturday', status: 'Transport Enabled' },
    { id: 3, date: '2026-08-01', title: 'Public Holiday', status: 'No Transport' },
]

const TransportCalendar: React.FC<TransportCalendarProps> = ({ section }) => {
    const [selectedDate] = useState(new Date().toISOString().slice(0, 10))
    const [view, setView] = useState<'month' | 'week'>('month')
    const [loading, setLoading] = useState(false)
    const [availability, setAvailability] = useState<{ transportEnabled: boolean; source?: string } | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchAvailability = async () => {
            setLoading(true)
            setError(null)
            try {
                const res = await fetch(`/api/transport-manager/transport/availability/${selectedDate}`)
                if (!res.ok) throw new Error('Failed to fetch')
                const json = await res.json()
                setAvailability(json.data || null)
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Error'
                setError(msg)
            } finally {
                setLoading(false)
            }
        }

        void fetchAvailability()
    }, [selectedDate])

    // Admin lists and forms
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
    const [terms, setTerms] = useState<Term[]>([])
    const [events, setEvents] = useState<CalendarEvent[]>([])

    // Transform events for display - use API data if available, otherwise fallback
    const displayEvents = events.length > 0 
        ? events.map(ev => ({ 
            id: ev.id || 0, 
            date: ev.start_date, 
            title: ev.name, 
            status: ev.transport_enabled ? 'Transport Enabled' : 'No Transport' 
          }))
        : fallbackEvents

    const [newYear, setNewYear] = useState<{ name: string; start_date: string; end_date: string }>({ name: '', start_date: '', end_date: '' })
    const [newTerm, setNewTerm] = useState<{ academic_year_id: string; name: string; start_date: string; end_date: string; transport_enabled: boolean }>({ academic_year_id: '', name: '', start_date: '', end_date: '', transport_enabled: true })
    const [newEvent, setNewEvent] = useState<Omit<CalendarEvent, 'academic_year_id' | 'academic_term_id'> & { academic_year_id: string; academic_term_id: string }>({ 
        academic_year_id: '', 
        academic_term_id: '', 
        name: '', 
        event_type: 'holiday', 
        start_date: '', 
        end_date: '', 
        transport_enabled: false, 
        description: '' 
    })
    const [modalType, setModalType] = useState<'year' | 'term' | 'event' | null>(null)

    useEffect(() => {
        const fetchLists = async () => {
            try {
                const [yRes, tRes, eRes] = await Promise.all([
                    fetch('/api/transport-manager/academic-years'),
                    fetch('/api/transport-manager/terms'),
                    fetch('/api/transport-manager/calendar-events'),
                ])

                if (yRes.ok) setAcademicYears((await yRes.json()).data || [])
                if (tRes.ok) setTerms((await tRes.json()).data || [])
                if (eRes.ok) setEvents((await eRes.json()).data || [])
            } catch (err) {
                console.error('Failed to fetch calendar lists', err)
            }
        }

        void fetchLists()
    }, [])

    const createYear = async () => {
        try {
            const res = await fetch('/api/transport-manager/academic-years', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newYear) })
            if (!res.ok) throw new Error('Create failed')
            const json = await res.json()
            setAcademicYears((s) => [json.data, ...s])
            setNewYear({ name: '', start_date: '', end_date: '' })
        } catch (err) {
            console.error('Failed to create academic year', err)
        }
    }

    const createTerm = async () => {
        try {
            const res = await fetch('/api/transport-manager/terms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newTerm) })
            if (!res.ok) throw new Error('Create failed')
            const json = await res.json()
            setTerms((s) => [json.data, ...s])
            setNewTerm({ academic_year_id: '', name: '', start_date: '', end_date: '', transport_enabled: true })
        } catch (err) {
            console.error('Failed to create term', err)
        }
    }

    const createEvent = async () => {
        try {
            // Convert string IDs to numbers for the API
            const eventData: CalendarEvent = {
                ...newEvent,
                academic_year_id: newEvent.academic_year_id ? parseInt(newEvent.academic_year_id) : undefined,
                academic_term_id: newEvent.academic_term_id ? parseInt(newEvent.academic_term_id) : undefined,
            }
            
            const res = await fetch('/api/transport-manager/calendar-events', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(eventData) 
            })
            if (!res.ok) throw new Error('Create failed')
            const json = await res.json()
            setEvents((s) => [json.data, ...s])
            setNewEvent({ 
                academic_year_id: '', 
                academic_term_id: '', 
                name: '', 
                event_type: 'holiday', 
                start_date: '', 
                end_date: '', 
                transport_enabled: false, 
                description: '' 
            })
            setModalType(null)
        } catch (err) {
            console.error('Failed to create event', err)
        }
    }

    const todayStatus = useMemo(() => {
        if (loading) return 'Checking transport availability...'
        if (error) return 'Unable to determine transport status'
        if (!availability) return 'No transport scheduled today'
        return availability.transportEnabled ? 'Scheduled transport today' : 'No transport scheduled today'
    }, [loading, availability, error])

    return (
        <div className="transport-calendar">
            <div className="transport-calendar__header">
                <div>
                    <h1>{section.heading || 'Transport Calendar'}</h1>
                    <p>{section.description || 'Manage academic terms, holidays, and transport availability.'}</p>
                </div>
                <div className="transport-calendar__actions">
                    <button
                        type="button"
                        className={view === 'month' ? 'active' : ''}
                        onClick={() => setView('month')}
                    >
                        Month
                    </button>
                    <button
                        type="button"
                        className={view === 'week' ? 'active' : ''}
                        onClick={() => setView('week')}
                    >
                        Week
                    </button>
                </div>
            </div>

            <div className="transport-calendar__summary-grid">
                <div className="transport-calendar__card transport-calendar__card--status">
                    <span>Today</span>
                    <strong>{selectedDate}</strong>
                    <p>{todayStatus}</p>
                    {availability && (
                        <small>Source: {availability.source}</small>
                    )}
                    {error && (
                        <small className="error">{error}</small>
                    )}
                </div>
                <div className="transport-calendar__card">
                    <span>Current Term</span>
                    <strong>First Term 2026</strong>
                    <p>Transport enabled through 2026-09-30</p>
                </div>
                <div className="transport-calendar__card">
                    <span>Weekly Operating Days</span>
                    <strong>Mon — Fri</strong>
                    <p>Make-up days can be scheduled on Saturdays.</p>
                </div>
            </div>

            <section className="transport-calendar__content">
                <div className="transport-calendar__grid">
                    <div className="transport-calendar__month">
                        <div className="transport-calendar__month-header">
                            <strong>July 2026</strong>
                            <span>Transport availability overview</span>
                        </div>
                        <div className="transport-calendar__month-days">
                            {WEEKDAYS.map((day) => (
                                <div key={day} className="transport-calendar__month-day-label">{day}</div>
                            ))}
                            {[...Array(31)].map((_, index) => {
                                const day = index + 1
                                const isWeekend = [0, 6].includes(new Date(2026, 6, day).getDay())
                                return (
                                    <div
                                        key={day}
                                        className={`transport-calendar__month-day ${isWeekend ? 'weekend' : 'weekday'}`}
                                    >
                                        <span>{day}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    <div className="transport-calendar__card transport-calendar__card--admin">
                        <span>Admin</span>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <button type="button" className="sm-button" onClick={() => setModalType('year')}>Add Academic Year</button>
                            <button type="button" className="sm-button" onClick={() => setModalType('term')}>Add Term</button>
                            <button type="button" className="sm-button" onClick={() => setModalType('event')}>Add Event</button>
                        </div>
                    </div>

                    <div className="transport-calendar__events">
                        <div className="transport-calendar__events-header">
                            <h2>Upcoming calendar events</h2>
                            <p>Holidays, closures, and special transport days.</p>
                        </div>
                        <ul>
                            {displayEvents.map((event) => (
                                <li key={event.id} className={`event event--${event.status === 'No Transport' ? 'no-transport' : 'enabled'}`}>
                                    <strong>{event.date}</strong>
                                    <span>{event.title}</span>
                                    <small>{event.status}</small>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* Portaled modals */}
            {modalType === 'year' && ReactDOM.createPortal(
                <div className="sm-overlay" role="dialog" aria-modal="true" onClick={() => setModalType(null)}>
                    <div className="sm-modal sm-modal--sm" onClick={e => e.stopPropagation()}>
                        <div className="sm-modal-header">
                            <div>
                                <h2 className="sm-modal-title">Add Academic Year</h2>
                                <p className="sm-modal-sub">Define a new academic year range</p>
                            </div>
                            <div className="sm-modal-header-actions">
                                <button className="sm-modal-close" onClick={() => setModalType(null)}>Close</button>
                            </div>
                        </div>
                        <div className="sm-modal-body">
                            <div className="sm-form-grid">
                                <div className="sm-form-field">
                                    <label className="sm-form-label">Name <span className="sm-required">*</span></label>
                                    <input className="sm-form-input" value={newYear.name} onChange={e => setNewYear(prev => ({ ...prev, name: e.target.value }))} />
                                </div>
                                <div className="sm-form-field">
                                    <label className="sm-form-label">Start Date <span className="sm-required">*</span></label>
                                    <input type="date" className="sm-form-input" value={newYear.start_date} onChange={e => setNewYear(prev => ({ ...prev, start_date: e.target.value }))} />
                                </div>
                                <div className="sm-form-field">
                                    <label className="sm-form-label">End Date <span className="sm-required">*</span></label>
                                    <input type="date" className="sm-form-input" value={newYear.end_date} onChange={e => setNewYear(prev => ({ ...prev, end_date: e.target.value }))} />
                                </div>
                            </div>
                        </div>
                        <div className="sm-modal-footer">
                            <button className="sm-button sm-button--ghost" onClick={() => setModalType(null)}>Cancel</button>
                            <button className="sm-button sm-button--primary" onClick={createYear}>Create Year</button>
                        </div>
                    </div>
                </div>, document.body)
            }

            {modalType === 'term' && ReactDOM.createPortal(
                <div className="sm-overlay" role="dialog" aria-modal="true" onClick={() => setModalType(null)}>
                    <div className="sm-modal sm-modal--sm" onClick={e => e.stopPropagation()}>
                        <div className="sm-modal-header">
                            <div>
                                <h2 className="sm-modal-title">Add Term</h2>
                                <p className="sm-modal-sub">Create an academic term</p>
                            </div>
                            <div className="sm-modal-header-actions">
                                <button className="sm-modal-close" onClick={() => setModalType(null)}>Close</button>
                            </div>
                        </div>
                        <div className="sm-modal-body">
                            <div className="sm-form-grid">
                                <div className="sm-form-field">
                                    <label className="sm-form-label">Academic Year</label>
                                    <select className="sm-form-select" value={newTerm.academic_year_id} onChange={e => setNewTerm(prev => ({ ...prev, academic_year_id: e.target.value }))}>
                                        <option value="">Select year</option>
                                        {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                                    </select>
                                </div>
                                <div className="sm-form-field">
                                    <label className="sm-form-label">Name <span className="sm-required">*</span></label>
                                    <input className="sm-form-input" value={newTerm.name} onChange={e => setNewTerm(prev => ({ ...prev, name: e.target.value }))} />
                                </div>
                                <div className="sm-form-field">
                                    <label className="sm-form-label">Start Date <span className="sm-required">*</span></label>
                                    <input type="date" className="sm-form-input" value={newTerm.start_date} onChange={e => setNewTerm(prev => ({ ...prev, start_date: e.target.value }))} />
                                </div>
                                <div className="sm-form-field">
                                    <label className="sm-form-label">End Date <span className="sm-required">*</span></label>
                                    <input type="date" className="sm-form-input" value={newTerm.end_date} onChange={e => setNewTerm(prev => ({ ...prev, end_date: e.target.value }))} />
                                </div>
                                <div className="sm-form-field">
                                    <label className="sm-form-label">Transport Enabled</label>
                                    <select className="sm-form-select" value={newTerm.transport_enabled ? '1' : '0'} onChange={e => setNewTerm(prev => ({ ...prev, transport_enabled: e.target.value === '1' }))}>
                                        <option value="1">Yes</option>
                                        <option value="0">No</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="sm-modal-footer">
                            <button className="sm-button sm-button--ghost" onClick={() => setModalType(null)}>Cancel</button>
                            <button className="sm-button sm-button--primary" onClick={createTerm}>Create Term</button>
                        </div>
                    </div>
                </div>, document.body)
            }

            {modalType === 'event' && ReactDOM.createPortal(
                <div className="sm-overlay" role="dialog" aria-modal="true" onClick={() => setModalType(null)}>
                    <div className="sm-modal sm-modal--lg" onClick={e => e.stopPropagation()}>
                        <div className="sm-modal-header">
                            <div>
                                <h2 className="sm-modal-title">Add Calendar Event</h2>
                                <p className="sm-modal-sub">Holidays, closures, make-up days, exams, etc.</p>
                            </div>
                            <div className="sm-modal-header-actions">
                                <button className="sm-modal-close" onClick={() => setModalType(null)}>Close</button>
                            </div>
                        </div>
                        <div className="sm-modal-body">
                            <div className="sm-form-grid">
                                <div className="sm-form-field">
                                    <label className="sm-form-label">Academic Year</label>
                                    <select className="sm-form-select" value={newEvent.academic_year_id} onChange={e => setNewEvent(prev => ({ ...prev, academic_year_id: e.target.value }))}>
                                        <option value="">Select year</option>
                                        {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                                    </select>
                                </div>
                                <div className="sm-form-field">
                                    <label className="sm-form-label">Term</label>
                                    <select className="sm-form-select" value={newEvent.academic_term_id} onChange={e => setNewEvent(prev => ({ ...prev, academic_term_id: e.target.value }))}>
                                        <option value="">Select term</option>
                                        {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div className="sm-form-field">
                                    <label className="sm-form-label">Name <span className="sm-required">*</span></label>
                                    <input className="sm-form-input" value={newEvent.name} onChange={e => setNewEvent(prev => ({ ...prev, name: e.target.value }))} />
                                </div>
                                <div className="sm-form-field">
                                    <label className="sm-form-label">Type</label>
                                    <select className="sm-form-select" value={newEvent.event_type} onChange={e => setNewEvent(prev => ({ ...prev, event_type: e.target.value }))}>
                                        <option value="holiday">Holiday</option>
                                        <option value="public-holiday">Public Holiday</option>
                                        <option value="closure">Closure</option>
                                        <option value="makeup">Make-up</option>
                                        <option value="exam">Exam</option>
                                        <option value="sports">Sports</option>
                                        <option value="custom">Custom</option>
                                    </select>
                                </div>
                                <div className="sm-form-field">
                                    <label className="sm-form-label">Start Date <span className="sm-required">*</span></label>
                                    <input type="date" className="sm-form-input" value={newEvent.start_date} onChange={e => setNewEvent(prev => ({ ...prev, start_date: e.target.value }))} />
                                </div>
                                <div className="sm-form-field">
                                    <label className="sm-form-label">End Date <span className="sm-required">*</span></label>
                                    <input type="date" className="sm-form-input" value={newEvent.end_date} onChange={e => setNewEvent(prev => ({ ...prev, end_date: e.target.value }))} />
                                </div>
                                <div className="sm-form-field">
                                    <label className="sm-form-label">Transport Enabled</label>
                                    <select className="sm-form-select" value={newEvent.transport_enabled ? '1' : '0'} onChange={e => setNewEvent(prev => ({ ...prev, transport_enabled: e.target.value === '1' }))}>
                                        <option value="1">Yes</option>
                                        <option value="0">No</option>
                                    </select>
                                </div>
                                <div className="sm-form-field sm-form-field--full">
                                    <label className="sm-form-label">Description</label>
                                    <textarea className="sm-form-textarea" value={newEvent.description || ''} onChange={e => setNewEvent(prev => ({ ...prev, description: e.target.value }))} />
                                </div>
                            </div>
                        </div>
                        <div className="sm-modal-footer">
                            <button className="sm-button sm-button--ghost" onClick={() => setModalType(null)}>Cancel</button>
                            <button className="sm-button sm-button--primary" onClick={createEvent}>Create Event</button>
                        </div>
                    </div>
                </div>, document.body)
            }
        </div>
    )
}

export default TransportCalendar