import './DashboardHeader.css'

type DashboardHeaderProps = {
    role: string
    title: string
    subtitle: string
    quickActions: string[]
    onLogout: () => void
}

const DashboardHeader = ({ role, title, subtitle, quickActions, onLogout }: DashboardHeaderProps) => {
    return (
        <header className="dashboardHeader">
            <div>
                <p className="dashboardHeader__role">{role || 'Unknown role'}</p>
                <h1>{title}</h1>
                <p className="dashboardHeader__subtitle">{subtitle}</p>
            </div>

            <div className="dashboardHeader__actions">
                <ul className="dashboardHeader__chips">
                    {quickActions.map((action) => (
                        <li key={action} className="dashboardHeader__chip">
                            {action}
                        </li>
                    ))}
                </ul>

                <button type="button" className="dashboardHeader__logout" onClick={onLogout}>
                    Logout
                </button>
            </div>
        </header>
    )
}

export default DashboardHeader
