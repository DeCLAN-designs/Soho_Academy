import './Attendance.css'

const BusAssistantAttendanceMenuItem = () => {
  return (
    <div className="attendance-content">
      <h2>Attendance</h2>
      <p>Track student boarding and drop-off attendance.</p>
      <div className="attendance-cards">
        <div className="attendance-card">
          <h3>Students boarded today</h3>
          <p>View today's boarding records</p>
        </div>
        <div className="attendance-card">
          <h3>Students dropped off today</h3>
          <p>Check drop-off completions</p>
        </div>
        <div className="attendance-card">
          <h3>Attendance reports</h3>
          <p>Generate attendance summaries</p>
        </div>
      </div>
    </div>
  )
}

export default BusAssistantAttendanceMenuItem
