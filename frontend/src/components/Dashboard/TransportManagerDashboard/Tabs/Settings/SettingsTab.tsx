import type { DashboardRoleConfig } from '../../../dashboard.types'
import './SettingsTab.css'

interface SettingsTabProps {
    section: DashboardRoleConfig['sections']['settings']
}

const SettingsTab = ({ section }: SettingsTabProps) => {
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

export default SettingsTab
