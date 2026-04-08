import type { DashboardRoleConfig } from '../dashboard.types'
import { useEffect, useMemo, useState } from 'react'
import { parentApi } from '../../../lib/api'
import type { ParentChildRecord } from '../../../lib/api'
import './ParentDashboard.css'

type ParentDashboardProps = {
    activeSection: string
}

export const parentDashboardConfig: DashboardRoleConfig = {
    title: 'Parent Dashboard',
    subtitle: 'Monitor your child transport schedule and updates.',
    quickActions: ['Track Bus', 'Absence Notice', 'Support'],
    navigation: [
        { id: 'overview', label: 'Overview' },
        { id: 'children', label: 'Children' },
        { id: 'trips', label: 'Trips' },
        { id: 'alerts', label: 'Alerts' },
    ],
    sections: {
        overview: {
            heading: 'Parent Overview',
            description: 'See trip status and notifications for your children.',
            cards: [
                'Today pickup status',
                'Today drop-off status',
                'Pending transport alerts',
            ],
        },
        children: {
            heading: 'Children Profiles',
            description: 'Manage child transport profile details.',
            cards: [
                'Assigned route and pickup point',
                'Emergency contact details',
                'Attendance summary',
            ],
        },
        trips: {
            heading: 'Trip Timeline',
            description: 'Review completed and upcoming transport activity.',
            cards: [
                'Morning route timeline',
                'Evening route timeline',
                'Recent trip history',
            ],
        },
        alerts: {
            heading: 'Alerts & Messages',
            description: 'Keep up with route changes and driver updates.',
            cards: [
                'Delay notices',
                'Route change notices',
                'General transport announcements',
            ],
        },
    },
}

const getChildLabel = (child: ParentChildRecord) =>
    `${child.admissionNumber} - ${child.firstName} ${child.lastName}`.trim()

const ParentDashboard = ({ activeSection }: ParentDashboardProps) => {
    const defaultSection = parentDashboardConfig.navigation[0].id
    const resolvedSectionId = parentDashboardConfig.sections[activeSection]
        ? activeSection
        : defaultSection
    const section = parentDashboardConfig.sections[resolvedSectionId]

    const [children, setChildren] = useState<ParentChildRecord[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState('')

    const childrenSummary = useMemo(() => {
        const activeCount = children.filter((child) => child.status === 'active').length
        const withdrawnCount = children.filter((child) => child.status === 'withdrawn').length

        return {
            total: children.length,
            active: activeCount,
            withdrawn: withdrawnCount,
        }
    }, [children])

    const loadChildren = async (withLoader = true) => {
        if (withLoader) {
            setIsLoading(true)
        }

        setErrorMessage('')

        try {
            const response = await parentApi.getChildren()
            setChildren(response.data?.children || [])
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to load children.')
        } finally {
            if (withLoader) {
                setIsLoading(false)
            }
        }
    }

    useEffect(() => {
        void loadChildren(true)
    }, [])

    const renderOverviewContent = () => (
        <div className="parentPanel">
            <div className="parentStats">
                <article className="parentStatCard">
                    <p>Children Linked</p>
                    <strong>{childrenSummary.total}</strong>
                </article>
                <article className="parentStatCard">
                    <p>Active Students</p>
                    <strong>{childrenSummary.active}</strong>
                </article>
                <article className="parentStatCard">
                    <p>Withdrawn Students</p>
                    <strong>{childrenSummary.withdrawn}</strong>
                </article>
            </div>

            <div className="parentLists">
                <section className="parentRecords" aria-label="Children preview">
                    <div className="parentRecordsHeader">
                        <h3>My Children</h3>
                        <button
                            type="button"
                            className="parentGhostButton"
                            onClick={() => void loadChildren(true)}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>
                    <ul>
                        {isLoading ? <li className="parentListItem parentListItem--empty">Loading...</li> : null}
                        {!isLoading && children.length === 0 ? (
                            <li className="parentListItem parentListItem--empty">
                                No children are linked to this parent account yet.
                            </li>
                        ) : null}
                        {children.slice(0, 5).map((child) => (
                            <li key={child.id} className="parentListItem">
                                <span className="parentPrimary">{getChildLabel(child)}</span>
                                <span className="parentMuted">
                                    {child.grade} {child.stream}
                                </span>
                                <span
                                    className={
                                        child.status === 'active'
                                            ? 'parentBadge parentBadge--active'
                                            : 'parentBadge parentBadge--withdrawn'
                                    }
                                >
                                    {child.status}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="parentRecords" aria-label="Latest alerts">
                    <h3>Latest Alerts</h3>
                    <ul>
                        <li className="parentListItem parentListItem--empty">
                            No alerts yet. Transport notices will appear here.
                        </li>
                    </ul>
                </section>
            </div>
        </div>
    )

    const renderChildrenContent = () => (
        <div className="parentPanel">
            <section className="parentRecords parentRecords--wide" aria-label="Children list">
                <div className="parentRecordsHeader">
                    <div>
                        <h3>Children Profiles</h3>
                        <p className="parentHint">
                            Children are matched using your account phone number.
                        </p>
                    </div>
                    <button
                        type="button"
                        className="parentGhostButton"
                        onClick={() => void loadChildren(true)}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
                <ul>
                    {isLoading ? <li className="parentListItem parentListItem--empty">Loading...</li> : null}
                    {!isLoading && children.length === 0 ? (
                        <li className="parentListItem parentListItem--empty">
                            No children are linked to this parent account yet.
                        </li>
                    ) : null}
                    {children.map((child) => (
                        <li key={child.id} className="parentListItem">
                            <span className="parentPrimary">{getChildLabel(child)}</span>
                            <span className="parentMuted">
                                {child.grade} {child.stream}
                            </span>
                            <span
                                className={
                                    child.status === 'active'
                                        ? 'parentBadge parentBadge--active'
                                        : 'parentBadge parentBadge--withdrawn'
                                }
                            >
                                {child.status}
                            </span>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    )

    const renderTripsContent = () => (
        <div className="parentPanel">
            <section className="parentRecords parentRecords--wide" aria-label="Trips">
                <h3>Trip Timeline</h3>
                <p className="parentHint">
                    Live trip tracking is not connected yet. This section will show pickup/drop-off activity
                    when route tracking is enabled.
                </p>
                <ul>
                    <li className="parentListItem parentListItem--empty">No trip events available.</li>
                </ul>
            </section>
        </div>
    )

    const renderAlertsContent = () => (
        <div className="parentPanel">
            <section className="parentRecords parentRecords--wide" aria-label="Alerts">
                <h3>Alerts & Messages</h3>
                <p className="parentHint">
                    When announcements, delays, and route changes are published, they will appear here.
                </p>
                <ul>
                    <li className="parentListItem parentListItem--empty">No alerts available.</li>
                </ul>
            </section>
        </div>
    )

    const renderSectionContent = () => {
        switch (resolvedSectionId) {
            case 'children':
                return renderChildrenContent()
            case 'trips':
                return renderTripsContent()
            case 'alerts':
                return renderAlertsContent()
            case 'overview':
            default:
                return renderOverviewContent()
        }
    }

    return (
        <>
            <div className="dashboardCards">
                {section.cards.map((card) => (
                    <article key={card} className="dashboardCard">
                        <p>{card}</p>
                    </article>
                ))}
            </div>

            {errorMessage ? <p className="parentStatus parentStatus--error">{errorMessage}</p> : null}

            {renderSectionContent()}
        </>
    )
}

export default ParentDashboard
