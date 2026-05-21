import type { DashboardRoleConfig } from '../../../dashboard.types'
import './CommunicationTab.css'

interface CommunicationTabProps {
    section: DashboardRoleConfig['sections']['communication']
}

const CommunicationTab = ({ section }: CommunicationTabProps) => {
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

export default CommunicationTab
