import './DashboardHeader.css'

type DashboardHeaderProps = {
    role: string
    welcomeMessage: string
    title: string
    subtitle: string
    quickActions: string[]
}

const DashboardHeader = ({
    role,
    welcomeMessage,
    title,
    subtitle,
    quickActions,
}: DashboardHeaderProps) => {
    return (
        <header className="dashboardHeader">
            <div className="dashboardHeader__intro">
                <p className="dashboardHeader__welcome">{welcomeMessage}</p>
                <h1>{title}</h1>
                <p className="dashboardHeader__subtitle">{subtitle}</p>
            </div>

            <div className="dashboardHeader__actions">
                <p className="dashboardHeader__role">{role || 'Unknown role'}</p>
                <ul className="dashboardHeader__chips">
                    {quickActions.map((action) => (
                        <li key={action} className="dashboardHeader__chip">
                            {action}
                        </li>
                    ))}
                </ul>
            </div>
        </header>
    )
}

export default DashboardHeader
