import { useMemo, useState } from 'react'
import './Dummy.css'

type TripStatus = 'On Time' | 'Delayed'
type VehicleStatus = 'On Time' | 'Delayed' | 'Maintenance'

type Route = {
  id: string
  name: string
  origin: string
  destination: string
  distanceKm: number
  fareUsd: number
  etaMinutes: number
}

type Trip = {
  id: string
  routeId: string
  departureTime: string
  platform: string
  seatsLeft: number
  status: TripStatus
}

type FleetVehicle = {
  id: string
  vehicleName: string
  type: 'Bus' | 'Mini Bus' | 'Van'
  driver: string
  occupancyPercent: number
  status: VehicleStatus
}

const routes: Route[] = [
  {
    id: 'R1',
    name: 'Airport Express',
    origin: 'Downtown Hub',
    destination: 'Soho Airport',
    distanceKm: 27,
    fareUsd: 8,
    etaMinutes: 40,
  },
  {
    id: 'R2',
    name: 'North Loop',
    origin: 'Soho Central',
    destination: 'River Park',
    distanceKm: 13,
    fareUsd: 4,
    etaMinutes: 24,
  },
  {
    id: 'R3',
    name: 'University Connector',
    origin: 'South Terminal',
    destination: 'City University',
    distanceKm: 18,
    fareUsd: 5,
    etaMinutes: 31,
  },
  {
    id: 'R4',
    name: 'Industrial Line',
    origin: 'East Depot',
    destination: 'West Plants',
    distanceKm: 22,
    fareUsd: 6,
    etaMinutes: 36,
  },
]

const initialTrips: Trip[] = [
  { id: 'T101', routeId: 'R1', departureTime: '08:10', platform: 'A1', seatsLeft: 8, status: 'On Time' },
  { id: 'T102', routeId: 'R2', departureTime: '08:20', platform: 'B2', seatsLeft: 3, status: 'Delayed' },
  { id: 'T103', routeId: 'R3', departureTime: '08:35', platform: 'A4', seatsLeft: 12, status: 'On Time' },
  { id: 'T104', routeId: 'R1', departureTime: '08:50', platform: 'A1', seatsLeft: 5, status: 'On Time' },
  { id: 'T105', routeId: 'R4', departureTime: '09:00', platform: 'C1', seatsLeft: 6, status: 'Delayed' },
  { id: 'T106', routeId: 'R2', departureTime: '09:10', platform: 'B2', seatsLeft: 10, status: 'On Time' },
]

const fleet: FleetVehicle[] = [
  { id: 'VH-08', vehicleName: 'Atlas 08', type: 'Bus', driver: 'Mina Torres', occupancyPercent: 74, status: 'On Time' },
  { id: 'VH-12', vehicleName: 'Nova 12', type: 'Mini Bus', driver: 'Joel Stone', occupancyPercent: 61, status: 'On Time' },
  { id: 'VH-14', vehicleName: 'Vector 14', type: 'Van', driver: 'Lara Ng', occupancyPercent: 45, status: 'Delayed' },
  { id: 'VH-21', vehicleName: 'Atlas 21', type: 'Bus', driver: 'Paulo Reed', occupancyPercent: 0, status: 'Maintenance' },
]

const toClassToken = (value: string) => value.toLowerCase().replace(/\s+/g, '-')

const App = () => {
  const [selectedRouteId, setSelectedRouteId] = useState<string>('all')
  const [trips, setTrips] = useState<Trip[]>(initialTrips)

  const routeLookup = useMemo(
    () => new Map<string, Route>(routes.map((route) => [route.id, route])),
    []
  )

  const visibleTrips =
    selectedRouteId === 'all'
      ? trips
      : trips.filter((trip) => trip.routeId === selectedRouteId)

  const totalSeatsLeft = trips.reduce((sum, trip) => sum + trip.seatsLeft, 0)
  const initialSeats = initialTrips.reduce((sum, trip) => sum + trip.seatsLeft, 0)
  const bookingsToday = initialSeats - totalSeatsLeft
  const delayedTrips = trips.filter((trip) => trip.status === 'Delayed').length
  const maintenanceVehicles = fleet.filter((vehicle) => vehicle.status === 'Maintenance').length
  const activeFleet = fleet.length - maintenanceVehicles

  const bookSeat = (tripId: string) => {
    setTrips((currentTrips) =>
      currentTrips.map((trip) =>
        trip.id === tripId && trip.seatsLeft > 0
          ? { ...trip, seatsLeft: trip.seatsLeft - 1 }
          : trip
      )
    )
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Dummy Transport System</p>
          <h1>CityLink Dispatch Dashboard</h1>
          <p className="subhead">
            Mock data for routes, live departures, and fleet monitoring.
          </p>
        </div>
        <div className="booking-chip">
          <span>{bookingsToday}</span>
          <small>Bookings today</small>
        </div>
      </header>

      <section className="control-panel">
        <label className="filter-box" htmlFor="route-filter">
          <span>Route Filter</span>
          <select
            id="route-filter"
            value={selectedRouteId}
            onChange={(event) => setSelectedRouteId(event.target.value)}
          >
            <option value="all">All Routes</option>
            {routes.map((route) => (
              <option key={route.id} value={route.id}>
                {route.name}
              </option>
            ))}
          </select>
        </label>

        <article className="stat-box">
          <h3>{trips.length}</h3>
          <p>Scheduled trips</p>
        </article>
        <article className="stat-box">
          <h3>{activeFleet}</h3>
          <p>Active vehicles</p>
        </article>
        <article className="stat-box">
          <h3>{totalSeatsLeft}</h3>
          <p>Seats available</p>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel routes">
          <h2>Route Catalog</h2>
          <div className="route-list">
            {routes.map((route) => (
              <div className="route-card" key={route.id}>
                <p className="route-title">{route.name}</p>
                <p className="route-path">
                  {route.origin} <span aria-hidden="true">-&gt;</span> {route.destination}
                </p>
                <div className="route-meta">
                  <span>{route.distanceKm} km</span>
                  <span>${route.fareUsd}</span>
                  <span>{route.etaMinutes} min</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel departures">
          <h2>Live Departures</h2>
          {visibleTrips.length === 0 ? (
            <p className="empty-state">No trips available for this route.</p>
          ) : (
            <div className="trip-list">
              {visibleTrips.map((trip) => {
                const route = routeLookup.get(trip.routeId)
                const tripStatusClass = `status-pill ${toClassToken(trip.status)}`
                const tripRoute = route ? route.name : trip.routeId
                return (
                  <div className="trip-item" key={trip.id}>
                    <div>
                      <p className="trip-time">{trip.departureTime}</p>
                      <p className="trip-route">{tripRoute}</p>
                      <p className="trip-platform">Platform {trip.platform}</p>
                    </div>
                    <div className="trip-actions">
                      <span className={tripStatusClass}>{trip.status}</span>
                      <button
                        type="button"
                        onClick={() => bookSeat(trip.id)}
                        disabled={trip.seatsLeft === 0}
                      >
                        Book ({trip.seatsLeft})
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </article>

        <article className="panel fleet">
          <h2>Fleet Overview</h2>
          <div className="fleet-list">
            {fleet.map((vehicle) => {
              const vehicleStatusClass = `status-pill ${toClassToken(vehicle.status)}`
              return (
                <div className="fleet-item" key={vehicle.id}>
                  <div>
                    <p className="fleet-name">{vehicle.vehicleName}</p>
                    <p className="fleet-meta">
                      {vehicle.type} | Driver: {vehicle.driver}
                    </p>
                  </div>
                  <div className="fleet-right">
                    <p>{vehicle.occupancyPercent}% occupied</p>
                    <span className={vehicleStatusClass}>{vehicle.status}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </article>

        <article className="panel alerts">
          <h2>System Alerts</h2>
          <ul>
            <li>{delayedTrips} delayed departures currently active.</li>
            <li>{maintenanceVehicles} vehicle in scheduled maintenance.</li>
            <li>
              {totalSeatsLeft < 20
                ? 'Seat inventory is getting low. Consider adding extra trips.'
                : 'Seat inventory level is healthy for this schedule window.'}
            </li>
          </ul>
        </article>
      </section>
    </div>
  )
}

export default App
