import React, { useEffect, useMemo, useState } from 'react'
import ReactDOM from 'react-dom'
import type { RoleSection } from '../../../../dashboard.types'
import { transportManagerApi, type AcademicYearRecord, type AcademicTermRecord, type CalendarEventRecord } from '../../../../../../lib/api'
import './TransportCalendar.css'

interface TransportCalendarProps {
    section: RoleSection
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Helper function for consistent date formatting
const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatFullDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

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
                const response = await transportManagerApi.getTransportAvailability(selectedDate)
                setAvailability(response.data || null)
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
    const [academicYears, setAcademicYears] = useState<AcademicYearRecord[]>([])
    const [terms, setTerms] = useState<AcademicTermRecord[]>([])
    const [events, setEvents] = useState<CalendarEventRecord[]>([])

    const [newYear, setNewYear] = useState<{ name: string; startDate: string; endDate: string }>({ name: '', startDate: '', endDate: '' })
    const [newTerm, setNewTerm] = useState<{ academicYearId: string; name: string; startDate: string; endDate: string; transportEnabled: boolean; status: string }>({ academicYearId: '', name: '', startDate: '', endDate: '', transportEnabled: true, status: 'Active' })
    const [newEvent, setNewEvent] = useState<{ 
        academicYearId: string; 
        academicTermId: string; 
        name: string; 
        eventType: string; 
        startDate: string; 
        endDate: string; 
        transportEnabled: boolean; 
        description: string 
    }>({ 
        academicYearId: '', 
        academicTermId: '', 
        name: '', 
        eventType: 'holiday', 
        startDate: '', 
        endDate: '', 
        transportEnabled: false, 
        description: '' 
    })
    const [modalType, setModalType] = useState<'year' | 'term' | 'event' | null>(null)
    const [editingTerm, setEditingTerm] = useState<AcademicTermRecord | null>(null)
    const [editingEvent, setEditingEvent] = useState<CalendarEventRecord | null>(null)

    useEffect(() => {
        const fetchLists = async () => {
            try {
                const [yearsRes, termsRes, eventsRes] = await Promise.all([
                    transportManagerApi.getAcademicYears(),
                    transportManagerApi.getAcademicTerms(),
                    transportManagerApi.getCalendarEvents(),
                ])

                setAcademicYears(yearsRes.data || [])
                setTerms(termsRes.data || [])
                setEvents(eventsRes.data || [])
            } catch (err) {
                console.error('Failed to fetch calendar lists', err)
            }
        }

        void fetchLists()
    }, [])

    const createYear = async () => {
        try {
            const response = await transportManagerApi.createAcademicYear(newYear)
            if (response.data) {
                setAcademicYears((s) => [response.data, ...s].filter((item): item is AcademicYearRecord => item !== undefined))
            }
            setNewYear({ name: '', startDate: '', endDate: '' })
        } catch (err) {
            console.error('Failed to create academic year', err)
        }
    }

    const createTerm = async () => {
        if (!newTerm.academicYearId) {
            console.error('Academic Year ID is required')
            return
        }
        try {
            const termData = {
                ...newTerm,
                academicYearId: parseInt(newTerm.academicYearId),
            }
            const response = await transportManagerApi.createAcademicTerm(termData)
            if (response.data) {
                setTerms((s) => [response.data, ...s].filter((item): item is AcademicTermRecord => item !== undefined))
            }
            setNewTerm({ academicYearId: '', name: '', startDate: '', endDate: '', transportEnabled: true, status: 'Active' })
        } catch (err) {
            console.error('Failed to create term', err)
        }
    }

    const updateTerm = async () => {
        if (!editingTerm) return
        try {
            const termData = {
                ...newTerm,
                academicYearId: newTerm.academicYearId ? parseInt(newTerm.academicYearId) : undefined,
            }
            const response = await transportManagerApi.updateAcademicTerm(editingTerm.id, termData)
            if (response.data) {
                setTerms((s) => s.map(t => t.id === editingTerm.id ? response.data : t).filter((item): item is AcademicTermRecord => item !== undefined))
            }
            setEditingTerm(null)
            setNewTerm({ academicYearId: '', name: '', startDate: '', endDate: '', transportEnabled: true, status: 'Active' })
        } catch (err) {
            console.error('Failed to update term', err)
        }
    }

    const deleteTerm = async (id: number) => {
        try {
            await transportManagerApi.deleteAcademicTerm(id)
            setTerms((s) => s.filter(t => t.id !== id).filter((item): item is AcademicTermRecord => item !== undefined))
        } catch (err) {
            console.error('Failed to delete term', err)
        }
    }

    const openEditTerm = (term: AcademicTermRecord) => {
        setEditingTerm(term)
        setNewTerm({
            academicYearId: term.academic_year_id.toString(),
            name: term.name,
            startDate: term.start_date,
            endDate: term.end_date,
            transportEnabled: term.transport_enabled,
            status: term.status || 'Active',
        })
        setModalType('term')
    }

    const createEvent = async () => {
        try {
            // Convert string IDs to numbers for the API
            const eventData = {
                ...newEvent,
                academicYearId: newEvent.academicYearId ? parseInt(newEvent.academicYearId) : undefined,
                academicTermId: newEvent.academicTermId ? parseInt(newEvent.academicTermId) : undefined,
            }
            
            const response = await transportManagerApi.createCalendarEvent(eventData)
            if (response.data) {
                setEvents((s) => [response.data, ...s].filter((item): item is CalendarEventRecord => item !== undefined))
            }
            setNewEvent({ 
                academicYearId: '', 
                academicTermId: '', 
                name: '', 
                eventType: 'holiday', 
                startDate: '', 
                endDate: '', 
                transportEnabled: false, 
                description: '' 
            })
            setModalType(null)
        } catch (err) {
            console.error('Failed to create event', err)
        }
    }

    const updateEvent = async () => {
        if (!editingEvent) return
        try {
            const eventData = {
                ...newEvent,
                academicYearId: newEvent.academicYearId ? parseInt(newEvent.academicYearId) : undefined,
                academicTermId: newEvent.academicTermId ? parseInt(newEvent.academicTermId) : undefined,
            }
            const response = await transportManagerApi.updateCalendarEvent(editingEvent.id, eventData)
            if (response.data) {
                setEvents((s) => s.map(e => e.id === editingEvent.id ? response.data : e).filter((item): item is CalendarEventRecord => item !== undefined))
            }
            setEditingEvent(null)
            setNewEvent({ 
                academicYearId: '', 
                academicTermId: '', 
                name: '', 
                eventType: 'holiday', 
                startDate: '', 
                endDate: '', 
                transportEnabled: false, 
                description: '' 
            })
            setModalType(null)
        } catch (err) {
            console.error('Failed to update event', err)
        }
    }

    const deleteEvent = async (id: number) => {
        try {
            await transportManagerApi.deleteCalendarEvent(id)
            setEvents((s) => s.filter(e => e.id !== id).filter((item): item is CalendarEventRecord => item !== undefined))
        } catch (err) {
            console.error('Failed to delete event', err)
        }
    }

    const openEditEvent = (event: CalendarEventRecord) => {
        setEditingEvent(event)
        setNewEvent({
            academicYearId: event.academic_year_id?.toString() || '',
            academicTermId: event.academic_term_id?.toString() || '',
            name: event.name,
            eventType: event.event_type || 'holiday',
            startDate: event.start_date,
            endDate: event.end_date,
            transportEnabled: event.transport_enabled,
            description: event.description || ''
        })
        setModalType('event')
    }

    const todayStatus = useMemo(() => {
        if (loading) return 'Checking transport availability...'
        if (error) return 'Unable to determine transport status'
        if (!availability) return 'No transport scheduled today'
        return availability.transportEnabled ? 'Scheduled transport today' : 'No transport scheduled today'
    }, [loading, availability, error])

    // Find current term based on today's date
    const currentTerm = useMemo(() => {
        const today = new Date()
        return terms.find(term => {
            const startDate = new Date(term.start_date)
            const endDate = new Date(term.end_date)
            return today >= startDate && today <= endDate
        })
    }, [terms])

    // Get current month and year for calendar display
    const currentMonthDate = useMemo(() => {
        return new Date()
    }, [])

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
                    <strong>{formatFullDate(selectedDate)}</strong>
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
                    <strong>{currentTerm ? currentTerm.name : 'No active term'}</strong>
                    <p>{currentTerm ? `Transport ${currentTerm.transport_enabled ? 'enabled' : 'disabled'} through ${formatDate(currentTerm.end_date)}` : 'No term currently active'}</p>
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
                            <strong>{currentMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
                            <span>Transport availability overview</span>
                        </div>
                        <div className="transport-calendar__legend">
                            <div className="legend-item">
                                <span className="legend-dot transport-enabled"></span>
                                <small>Transport Available</small>
                            </div>
                            <div className="legend-item">
                                <span className="legend-dot no-transport"></span>
                                <small>No Transport</small>
                            </div>
                            <div className="legend-item">
                                <span className="legend-indicator">•</span>
                                <small>Special Event</small>
                            </div>
                            <div className="legend-item">
                                <span className="legend-indicator holiday">○</span>
                                <small>Holiday</small>
                            </div>
                        </div>
                        <div className="transport-calendar__month-days">
                            {WEEKDAYS.map((day) => (
                                <div key={day} className="transport-calendar__month-day-label">{day}</div>
                            ))}
                            {[...Array(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0).getDate())].map((_, index) => {
                                const day = index + 1
                                const currentDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), day)
                                const isWeekend = [0, 6].includes(currentDate.getDay())
                                
                                // Check if this date has transport enabled based on terms and events
                                const activeTerm = terms.find(term => {
                                    const startDate = new Date(term.start_date)
                                    const endDate = new Date(term.end_date)
                                    return currentDate >= startDate && currentDate <= endDate && term.transport_enabled
                                })
                                
                                // Find all events for this day
                                const eventsForDay = events.filter(event => {
                                    const eventStart = new Date(event.start_date)
                                    const eventEnd = new Date(event.end_date)
                                    return currentDate >= eventStart && currentDate <= eventEnd
                                })
                                
                                // Prioritize events: makeup/exam/sports events override holidays
                                const priorityEvents = eventsForDay.filter(e => ['makeup', 'exam', 'sports'].includes(e.event_type))
                                const holidayEvents = eventsForDay.filter(e => ['holiday', 'public-holiday', 'closure'].includes(e.event_type))
                                
                                // Determine transport status based on event priority
                                let transportEnabled = false
                                let hasPriorityEvent = false
                                let hasHolidayEvent = false
                                
                                if (priorityEvents.length > 0) {
                                    // Priority events control transport directly
                                    hasPriorityEvent = true
                                    transportEnabled = priorityEvents.some(e => e.transport_enabled)
                                } else if (holidayEvents.length > 0) {
                                    // Holidays control transport (usually disabled unless explicitly enabled)
                                    hasHolidayEvent = true
                                    transportEnabled = holidayEvents.some(e => e.transport_enabled)
                                } else {
                                    // No events, base on term
                                    transportEnabled = activeTerm ? true : false
                                }
                                
                                return (
                                    <div
                                        key={day}
                                        className={`transport-calendar__month-day ${isWeekend ? 'weekend' : 'weekday'} ${transportEnabled ? 'transport-enabled' : 'no-transport'} ${hasPriorityEvent ? 'priority-event' : ''} ${hasHolidayEvent ? 'holiday-event' : ''}`}
                                        title={hasPriorityEvent ? 'Special event with custom transport' : hasHolidayEvent ? 'Holiday period' : 'Regular term day'}
                                    >
                                        <span>{day}</span>
                                        {hasPriorityEvent && <span className="event-indicator">•</span>}
                                        {hasHolidayEvent && <span className="event-indicator holiday">○</span>}
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
                            <h2>Academic Years</h2>
                            <p>Manage academic year calendar periods.</p>
                        </div>
                        <ul>
                            {academicYears.map((year) => (
                                <li key={year.id} className="event event--enabled">
                                    <strong>{year.name}</strong>
                                    <span>{formatDate(year.start_date)} - {formatDate(year.end_date)}</span>
                                    <small>Active</small>
                                </li>
                            ))}
                            {academicYears.length === 0 && <li className="event">No academic years created yet</li>}
                        </ul>
                    </div>

                    <div className="transport-calendar__events">
                        <div className="transport-calendar__events-header">
                            <h2>Academic Terms</h2>
                            <p>Manage term schedules and transport settings.</p>
                        </div>
                        <ul>
                            {terms.map((term) => (
                                <li key={term.id} className={`event event--${term.transport_enabled ? 'enabled' : 'no-transport'}`}>
                                    <strong>{term.name}</strong>
                                    <span>{formatDate(term.start_date)} - {formatDate(term.end_date)}</span>
                                    <small>{term.transport_enabled ? 'Transport Enabled' : 'No Transport'}</small>
                                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                        <button 
                                            type="button" 
                                            className="sm-button sm-button--ghost" 
                                            style={{ fontSize: '12px', padding: '4px 8px' }}
                                            onClick={() => openEditTerm(term)}
                                        >
                                            Edit
                                        </button>
                                        <button 
                                            type="button" 
                                            className="sm-button sm-button--ghost" 
                                            style={{ fontSize: '12px', padding: '4px 8px', color: '#ef4444' }}
                                            onClick={() => deleteTerm(term.id)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </li>
                            ))}
                            {terms.length === 0 && <li className="event">No terms created yet</li>}
                        </ul>
                    </div>

                    <div className="transport-calendar__events">
                        <div className="transport-calendar__events-header">
                            <h2>Calendar Events</h2>
                            <p>Holidays, closures, and special transport days.</p>
                        </div>
                        <ul>
                            {events.map((event) => (
                                <li key={event.id} className={`event event--${event.transport_enabled ? 'enabled' : 'no-transport'}`}>
                                    <strong>{formatDate(event.start_date)}</strong>
                                    <span>{event.name}</span>
                                    <small>{event.transport_enabled ? 'Transport Enabled' : 'No Transport'}</small>
                                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                        <button 
                                            type="button" 
                                            className="sm-button sm-button--ghost" 
                                            style={{ fontSize: '12px', padding: '4px 8px' }}
                                            onClick={() => openEditEvent(event)}
                                        >
                                            Edit
                                        </button>
                                        <button 
                                            type="button" 
                                            className="sm-button sm-button--ghost" 
                                            style={{ fontSize: '12px', padding: '4px 8px', color: '#ef4444' }}
                                            onClick={() => deleteEvent(event.id)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </li>
                            ))}
                            {events.length === 0 && <li className="event">No calendar events created yet</li>}
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
                                    <input type="date" className="sm-form-input" value={newYear.startDate} onChange={e => setNewYear(prev => ({ ...prev, startDate: e.target.value }))} />
                                </div>
                                <div className="sm-form-field">
                                    <label className="sm-form-label">End Date <span className="sm-required">*</span></label>
                                    <input type="date" className="sm-form-input" value={newYear.endDate} onChange={e => setNewYear(prev => ({ ...prev, endDate: e.target.value }))} />
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
                <div className="sm-overlay" role="dialog" aria-modal="true" onClick={() => { setModalType(null); setEditingTerm(null) }}>
                    <div className="sm-modal sm-modal--sm" onClick={e => e.stopPropagation()}>
                        <div className="sm-modal-header">
                            <div>
                                <h2 className="sm-modal-title">{editingTerm ? 'Edit Term' : 'Add Term'}</h2>
                                <p className="sm-modal-sub">{editingTerm ? 'Update academic term details' : 'Create an academic term'}</p>
                            </div>
                            <div className="sm-modal-header-actions">
                                <button className="sm-modal-close" onClick={() => { setModalType(null); setEditingTerm(null) }}>Close</button>
                            </div>
                        </div>
                        <div className="sm-modal-body">
                            <div className="sm-form-grid">
                                <div className="sm-form-field">
                                    <label className="sm-form-label">Academic Year</label>
                                    <select className="sm-form-select" value={newTerm.academicYearId} onChange={e => setNewTerm(prev => ({ ...prev, academicYearId: e.target.value }))}>
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
                                    <input type="date" className="sm-form-input" value={newTerm.startDate} onChange={e => setNewTerm(prev => ({ ...prev, startDate: e.target.value }))} />
                                </div>
                                <div className="sm-form-field">
                                    <label className="sm-form-label">End Date <span className="sm-required">*</span></label>
                                    <input type="date" className="sm-form-input" value={newTerm.endDate} onChange={e => setNewTerm(prev => ({ ...prev, endDate: e.target.value }))} />
                                </div>
                                <div className="sm-form-field">
                                    <label className="sm-form-label">Transport Enabled</label>
                                    <select className="sm-form-select" value={newTerm.transportEnabled ? '1' : '0'} onChange={e => setNewTerm(prev => ({ ...prev, transportEnabled: e.target.value === '1' }))}>
                                        <option value="1">Yes</option>
                                        <option value="0">No</option>
                                    </select>
                                </div>
                                <div className="sm-form-field">
                                    <label className="sm-form-label">Status</label>
                                    <select className="sm-form-select" value={newTerm.status} onChange={e => setNewTerm(prev => ({ ...prev, status: e.target.value }))}>
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="sm-modal-footer">
                            <button className="sm-button sm-button--ghost" onClick={() => { setModalType(null); setEditingTerm(null) }}>Cancel</button>
                            <button className="sm-button sm-button--primary" onClick={editingTerm ? updateTerm : createTerm}>
                                {editingTerm ? 'Update Term' : 'Create Term'}
                            </button>
                        </div>
                    </div>
                </div>, document.body)
            }

            {modalType === 'event' && ReactDOM.createPortal(
                <div className="sm-overlay" role="dialog" aria-modal="true" onClick={() => { setModalType(null); setEditingEvent(null) }}>
                    <div className="sm-modal sm-modal--lg" onClick={e => e.stopPropagation()}>
                        <div className="sm-modal-header">
                            <div>
                                <h2 className="sm-modal-title">{editingEvent ? 'Edit Calendar Event' : 'Add Calendar Event'}</h2>
                                <p className="sm-modal-sub">{editingEvent ? 'Update calendar event details' : 'Holidays, closures, make-up days, exams, etc.'}</p>
                            </div>
                            <div className="sm-modal-header-actions">
                                <button className="sm-modal-close" onClick={() => { setModalType(null); setEditingEvent(null) }}>Close</button>
                            </div>
                        </div>
                        <div className="sm-modal-body">
                            <div className="sm-form-grid">
                                <div className="sm-form-field">
                                    <label className="sm-form-label">Academic Year</label>
                                    <select className="sm-form-select" value={newEvent.academicYearId} onChange={e => setNewEvent(prev => ({ ...prev, academicYearId: e.target.value }))}>
                                        <option value="">Select year</option>
                                        {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                                    </select>
                                </div>
                                <div className="sm-form-field">
                                    <label className="sm-form-label">Term</label>
                                    <select className="sm-form-select" value={newEvent.academicTermId} onChange={e => setNewEvent(prev => ({ ...prev, academicTermId: e.target.value }))}>
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
                                    <select className="sm-form-select" value={newEvent.eventType} onChange={e => setNewEvent(prev => ({ ...prev, eventType: e.target.value }))}>
                                        <option value="holiday">Holiday</option>
                                        <option value="public-holiday">Public Holiday</option>
                                        <option value="closure">Closure</option>
                                        <option value="makeup">Make-up (Overrides Holidays)</option>
                                        <option value="exam">Exam (Overrides Holidays)</option>
                                        <option value="sports">Sports (Overrides Holidays)</option>
                                        <option value="custom">Custom</option>
                                    </select>
                                    <small style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Make-up, Exam, and Sports events override holiday transport settings</small>
                                </div>
                                <div className="sm-form-field">
                                    <label className="sm-form-label">Start Date <span className="sm-required">*</span></label>
                                    <input type="date" className="sm-form-input" value={newEvent.startDate} onChange={e => setNewEvent(prev => ({ ...prev, startDate: e.target.value }))} />
                                </div>
                                <div className="sm-form-field">
                                    <label className="sm-form-label">End Date <span className="sm-required">*</span></label>
                                    <input type="date" className="sm-form-input" value={newEvent.endDate} onChange={e => setNewEvent(prev => ({ ...prev, endDate: e.target.value }))} />
                                </div>
                                <div className="sm-form-field">
                                    <label className="sm-form-label">Transport Enabled</label>
                                    <select className="sm-form-select" value={newEvent.transportEnabled ? '1' : '0'} onChange={e => setNewEvent(prev => ({ ...prev, transportEnabled: e.target.value === '1' }))}>
                                        <option value="1">Yes</option>
                                        <option value="0">No</option>
                                    </select>
                                    <small style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>For Make-up/Exam/Sports events, this overrides holiday settings</small>
                                </div>
                                <div className="sm-form-field sm-form-field--full">
                                    <label className="sm-form-label">Description</label>
                                    <textarea className="sm-form-textarea" value={newEvent.description || ''} onChange={e => setNewEvent(prev => ({ ...prev, description: e.target.value }))} />
                                </div>
                            </div>
                        </div>
                        <div className="sm-modal-footer">
                            <button className="sm-button sm-button--ghost" onClick={() => { setModalType(null); setEditingEvent(null) }}>Cancel</button>
                            <button className="sm-button sm-button--primary" onClick={editingEvent ? updateEvent : createEvent}>
                                {editingEvent ? 'Update Event' : 'Create Event'}
                            </button>
                        </div>
                    </div>
                </div>, document.body)
            }
        </div>
    )
}

export default TransportCalendar