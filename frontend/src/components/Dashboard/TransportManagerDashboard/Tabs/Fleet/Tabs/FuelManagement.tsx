import type { RoleSection } from '../../../../dashboard.types'
import './FuelManagement.css'

type FuelManagementProps = {
    section: RoleSection
}

const FuelManagement = ({ section }: FuelManagementProps) => {
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

export default FuelManagement
