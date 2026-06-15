import { useState } from 'react'
import { getSidebarNavigationItems, type NavigationItem } from './sidebarNavigation'
import './SideBar.css'

type NavigationItem = {
    id: string
    label: string
}

const DEFAULT_NAVIGATION_ITEMS: NavigationItem[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'profile', label: 'Profile' },
    { id: 'settings', label: 'Settings' },
]

const ROLE_NAVIGATION_ITEMS: Record<string, NavigationItem[]> = {
    Parent: [
        { id: 'overview', label: 'Overview' },
        { id: 'children', label: 'Children' },
        { id: 'trips', label: 'Trips' },
        { id: 'requests', label: 'Requests' },
        { id: 'alerts', label: 'Alerts' },
    ],
    Driver: [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'attendance', label: 'Attendance' },
        { id: 'fuelMaintenance', label: 'Fuel & Maintenance' },
        { id: 'complianceDocuments', label: 'Compliance Documents' },
        { id: 'incidents', label: 'Incidents & Accidents' },
        { id: 'compliantsReports', label: 'Compliants & Reports' },
        { id: 'myActivity', label: 'My Activity' },
        { id: 'profile', label: 'Profile' },
    ],
    'Bus Assistant': [
        { id: 'overview', label: 'Dashboard' },
        { id: 'attendance', label: 'Attendance' },
        { id: 'accidents-reports', label: 'Accidents and Reports' },
        { id: 'complaints-incidents', label: 'Complaints and incidents' },
        { id: 'profile', label: 'Profile' },
    ],
    'Transport Manager': [
        { id: 'overview', label: 'Overview' },
        { id: 'fleet', label: 'Fleet' },
        { id: 'trips', label: 'Trips' },
        { id: 'requests', label: 'Requests' },
        { id: 'staff', label: 'Staff' },
        { id: 'reports', label: 'Reports' },
    ],
    'School Admin': [
        { id: 'overview', label: 'Overview' },
        { id: 'admissions', label: 'Admissions' },
        { id: 'contactChanges', label: 'Contact Changes' },
        { id: 'withdrawals', label: 'Withdrawals' },
        { id: 'masterData', label: 'Master Data' },
    ],
}

export const getSidebarNavigationItems = (role: string): NavigationItem[] => {
    return ROLE_NAVIGATION_ITEMS[role] || DEFAULT_NAVIGATION_ITEMS
}

type SideBarProps = {
    role: string
    activeItem: string
    onSelect: (itemId: string) => void
    onLogout: () => void
}

const SideBar = ({ role, activeItem, onSelect, onLogout }: SideBarProps) => {
    const items = getSidebarNavigationItems(role)
    const isItemActive = (item: NavigationItem): boolean =>
        activeItem === item.id || Boolean(item.children?.some((child) => isItemActive(child)))
    const getActiveGroupIds = () => items.filter((item) => isItemActive(item)).map((item) => item.id)
    const [expandedItems, setExpandedItems] = useState<string[]>(getActiveGroupIds)

    const toggleExpandedItem = (itemId: string) => {
        setExpandedItems((currentItems) =>
            currentItems.includes(itemId)
                ? currentItems.filter((currentItem) => currentItem !== itemId)
                : [...currentItems, itemId],
        )
    }

    return (
        <aside className="sidebar">
            <div className="sidebar__brand">
                <p className="sidebar__kicker">Soho Transport</p>
                <h2>Workspace</h2>
            </div>

            <p className="sidebar__role">Role: {role || 'Unknown'}</p>

            <nav aria-label="Dashboard navigation" className="sidebar__nav">
                <ul className="sidebar__menu">
                    {items.map((item) => {
                        const hasChildren = Boolean(item.children?.length)
                        const isExpanded = expandedItems.includes(item.id)
                        const activeClass = activeItem === item.id ? ' sidebar__item--active' : ''
                        const expandedClass = hasChildren && isExpanded ? ' sidebar__item--expanded' : ''

                        return (
                            <li key={item.id} className={hasChildren ? 'sidebar__menuGroup' : undefined}>
                                <button
                                    type="button"
                                    className={`sidebar__item${activeClass}${expandedClass}`}
                                    onClick={() => {
                                        if (hasChildren) {
                                            toggleExpandedItem(item.id)
                                            return
                                        }

                                        onSelect(item.id)
                                    }}
                                    aria-expanded={hasChildren ? isExpanded : undefined}
                                >
                                    <span>{item.label}</span>
                                    {hasChildren && (
                                        <span
                                            className={isExpanded ? 'sidebar__chevron sidebar__chevron--open' : 'sidebar__chevron'}
                                            aria-hidden="true"
                                        >
                                            ›
                                        </span>
                                    )}
                                </button>
                                {hasChildren && isExpanded && (
                                    <ul className="sidebar__submenu">
                                        {item.children?.map((child) => (
                                            <li key={child.id}>
                                                <button
                                                    type="button"
                                                    className={activeItem === child.id ? 'sidebar__subitem sidebar__subitem--active' : 'sidebar__subitem'}
                                                    onClick={() => onSelect(child.id)}
                                                >
                                                    {child.label}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </li>
                        )
                    })}
                </ul>
            </nav>

            <button
                type="button"
                className="sidebar__logoutButton"
                onClick={onLogout}
                aria-label="Logout"
            >
                🚪 Logout
            </button>
        </aside>
    )
}

export default SideBar
