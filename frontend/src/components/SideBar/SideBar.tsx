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
        { id: 'alerts', label: 'Alerts' },
    ],
    Driver: [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'attendance', label: 'Attendance' },
        { id: 'fuelMaintenance', label: 'Fuel & Maintenance' },
        { id: 'incidents', label: 'Incidents & Accidents' },
        { id: 'compliantsReports', label: 'Compliants & Reports' },
        { id: 'myActivity', label: 'My Activity' },
        { id: 'profile', label: 'Profile' },
    ],
    'Bus Assistant': [
        { id: 'overview', label: 'Overview' },
        { id: 'boarding', label: 'Boarding' },
        { id: 'students', label: 'Students' },
        { id: 'safety', label: 'Safety' },
    ],
    'Transport Manager': [
        { id: 'overview', label: 'Overview' },
        { id: 'fleet', label: 'Fleet' },
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

    return (
        <aside className="sidebar">
            <div className="sidebar__brand">
                <p className="sidebar__kicker">Soho Transport</p>
                <h2>Workspace</h2>
            </div>

            <p className="sidebar__role">Role: {role || 'Unknown'}</p>

            <nav aria-label="Dashboard navigation" className="sidebar__nav">
                <ul className="sidebar__menu">
                    {items.map((item) => (
                        <li key={item.id}>
                            <button
                                type="button"
                                className={activeItem === item.id ? 'sidebar__item sidebar__item--active' : 'sidebar__item'}
                                onClick={() => onSelect(item.id)}
                            >
                                {item.label}
                            </button>
                        </li>
                    ))}
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
