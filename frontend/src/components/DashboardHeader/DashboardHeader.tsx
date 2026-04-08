import './DashboardHeader.css'

type DashboardHeaderProps = {
    role: string
    welcomeMessage: string
    title: string
    subtitle: string
    quickActions: string[]
    userName: string
    profilePhotoUrl: string | null
}

const getInitials = (userName: string) => {
    const initials = String(userName || '')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((namePart) => namePart.charAt(0).toUpperCase())
        .filter(Boolean)
        .join('')

    return initials || 'SU'
}

const DashboardHeader = ({
    role,
    welcomeMessage,
    title,
    subtitle,
    quickActions,
    userName,
    profilePhotoUrl,
}: DashboardHeaderProps) => {
    return (
        <header className="dashboardHeader">
            <div className="dashboardHeader__intro">
                <p className="dashboardHeader__welcome">{welcomeMessage}</p>
                <h1>{title}</h1>
                <p className="dashboardHeader__subtitle">{subtitle}</p>
            </div>

            <div className="dashboardHeader__actions">
                <div className="dashboardHeader__profileCard">
                    <div className="dashboardHeader__avatar" aria-hidden="true">
                        {profilePhotoUrl ? (
                            <img src={profilePhotoUrl} alt="" />
                        ) : (
                            <span>{getInitials(userName)}</span>
                        )}
                    </div>

                    <div className="dashboardHeader__profileCopy">
                        <p className="dashboardHeader__label">Signed in as</p>
                        <p className="dashboardHeader__name">{userName || 'Soho User'}</p>
                        <p className="dashboardHeader__role">{role || 'Unknown role'}</p>
                    </div>
                </div>

                {quickActions.length > 0 ? (
                    <ul className="dashboardHeader__chips">
                        {quickActions.map((action) => (
                            <li key={action} className="dashboardHeader__chip">
                                {action}
                            </li>
                        ))}
                    </ul>
                ) : null}
            </div>
        </header>
    )
}

export default DashboardHeader
