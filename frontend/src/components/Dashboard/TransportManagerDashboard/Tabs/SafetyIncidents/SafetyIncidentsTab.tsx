import type { DashboardRoleConfig } from '../../../dashboard.types'
import './SafetyIncidentsTab.css'

interface SafetyIncidentsTabProps {
    section: DashboardRoleConfig['sections']['safety-incidents']
}

const SafetyIncidentsTab = ({ section }: SafetyIncidentsTabProps) => {
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

export default SafetyIncidentsTab
