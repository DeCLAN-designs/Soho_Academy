import type { DashboardRoleConfig } from '../../../dashboard.types'
import './StudentsTab.css'

interface StudentsTabProps {
    section: DashboardRoleConfig['sections']['students']
}

const StudentsTab = ({ section }: StudentsTabProps) => {
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

export default StudentsTab
