import type { DashboardRoleConfig } from '../../../dashboard.types'
import './RoutesTab.css'

interface RoutesTabProps {
    section: DashboardRoleConfig['sections']['routes']
}

const RoutesTab = ({ section }: RoutesTabProps) => {
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

export default RoutesTab
