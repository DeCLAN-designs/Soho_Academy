import './SideBar.css'

type NavigationItem = {
    id: string
    label: string
}

type SideBarProps = {
    role: string
    items: NavigationItem[]
    activeItem: string
    onSelect: (itemId: string) => void
}

const SideBar = ({ role, items, activeItem, onSelect }: SideBarProps) => {
    return (
        <aside className="sidebar">
            <div className="sidebar__brand">
                <p className="sidebar__kicker">Soho Transport</p>
                <h2>Workspace</h2>
            </div>

            <p className="sidebar__role">Role: {role || 'Unknown'}</p>

            <nav aria-label="Dashboard navigation">
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
        </aside>
    )
}

export default SideBar
