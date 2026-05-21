import type { RoleSection } from '../../../../dashboard.types'
import './Maintenance.css'

type MaintenanceProps = {
    section: RoleSection
}

const Maintenance = ({ section }: MaintenanceProps) => {
    return (
        <div>
            <h3>{section.heading}</h3>
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

export default Maintenance
