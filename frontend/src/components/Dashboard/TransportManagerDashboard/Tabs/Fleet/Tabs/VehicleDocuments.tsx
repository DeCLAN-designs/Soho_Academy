import type { RoleSection } from '../../../../dashboard.types'
import './VehicleDocuments.css'

type VehicleDocumentsProps = {
    section: RoleSection
}

const VehicleDocuments = ({ section }: VehicleDocumentsProps) => {
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

export default VehicleDocuments
