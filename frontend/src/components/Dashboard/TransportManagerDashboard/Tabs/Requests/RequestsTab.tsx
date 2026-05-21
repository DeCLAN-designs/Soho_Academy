import type { DashboardRoleConfig } from '../../../dashboard.types'
import './RequestsTab.css'

interface RequestsTabProps {
    section: DashboardRoleConfig['sections']['requests']
}

const RequestsTab = ({ section }: RequestsTabProps) => {
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

export default RequestsTab
