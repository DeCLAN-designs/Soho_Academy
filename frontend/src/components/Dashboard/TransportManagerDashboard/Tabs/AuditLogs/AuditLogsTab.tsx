import type { DashboardRoleConfig } from '../../../dashboard.types'
import './AuditLogsTab.css'

interface AuditLogsTabProps {
    section: DashboardRoleConfig['sections']['audit-logs']
}

const AuditLogsTab = ({ section }: AuditLogsTabProps) => {
    return (
        <div className="tabContent">
            <h2>{section.heading}</h2>
            <p>{section.description}</p>
            <div className="dashboardCards">
                {section.cards.map((card) => (
                    <article key={card} className="dashboardCard">
                        <p>{card}</p>
                    </article>
                ))}
            </div>
        </div>
    )
}

export default AuditLogsTab
