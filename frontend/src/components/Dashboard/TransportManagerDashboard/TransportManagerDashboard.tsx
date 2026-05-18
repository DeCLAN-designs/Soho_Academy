import { transportManagerDashboardConfig } from './transportManagerDashboard.config'

type TransportManagerDashboardProps = {
    activeSection: string
}

const TransportManagerDashboard = ({ activeSection }: TransportManagerDashboardProps) => {
    const defaultSection = transportManagerDashboardConfig.navigation[0].id
    const section =
        transportManagerDashboardConfig.sections[activeSection] ||
        transportManagerDashboardConfig.sections[defaultSection]

    return (
        <>
            <div className="dashboardCards">
                {section.cards.map((card) => (
                    <article key={card} className="dashboardCard">
                        <p>{card}</p>
                    </article>
                ))}
            </div>
        </>
    )
}

export default TransportManagerDashboard
