const pool = require("../config/db.js");

const getOperationalReports = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
      dateFilter = ` AND t.created_at BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }
    
    // Get trip statistics
    const [tripStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_trips,
        SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) as completed_trips,
        SUM(CASE WHEN t.status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled_trips,
        SUM(CASE WHEN t.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_trips
      FROM trip_monitoring t
      WHERE 1=1 ${dateFilter}
    `, params);
    
    // Get attendance statistics
    const [attendanceStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_records,
        SUM(CASE WHEN a.status = 'Boarded' THEN 1 ELSE 0 END) as boarded,
        SUM(CASE WHEN a.status = 'Alighted' THEN 1 ELSE 0 END) as alighted,
        SUM(CASE WHEN a.status = 'Not Boarded' THEN 1 ELSE 0 END) as not_boarded
      FROM student_attendance a
      WHERE 1=1 ${dateFilter}
    `, params);
    
    // Get route performance
    const [routePerformance] = await pool.query(`
      SELECT 
        r.route_name,
        COUNT(DISTINCT t.id) as trip_count,
        AVG(
          CASE 
            WHEN t.status = 'Completed' THEN 
              TIMESTAMPDIFF(MINUTE, t.scheduled_start_time, t.actual_end_time)
            ELSE NULL 
          END
        ) as avg_trip_duration_minutes
      FROM trip_monitoring t
      JOIN routes r ON t.route_id = r.route_id
      WHERE 1=1 ${dateFilter}
      GROUP BY r.route_id, r.route_name
      ORDER BY trip_count DESC
      LIMIT 10
    `, params);
    
    return res.status(200).json({
      success: true,
      message: "Operational reports retrieved successfully.",
      data: {
        tripStats: tripStats[0],
        attendanceStats: attendanceStats[0],
        routePerformance,
      },
    });
  } catch (error) {
    console.error("Get operational reports error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch operational reports.",
    });
  }
};

const getFinancialReports = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
      dateFilter = ` AND created_at BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }
    
    // Get fuel costs
    const [fuelCosts] = await pool.query(`
      SELECT 
        SUM(amount) as total_fuel_cost,
        AVG(amount) as avg_fuel_cost,
        COUNT(*) as total_requests
      FROM fuel_maintenance_requests
      WHERE request_type = 'Fuel' AND status = 'Approved' ${dateFilter}
    `, params);
    
    // Get maintenance costs
    const [maintenanceCosts] = await pool.query(`
      SELECT 
        SUM(amount) as total_maintenance_cost,
        AVG(amount) as avg_maintenance_cost,
        COUNT(*) as total_requests
      FROM fuel_maintenance_requests
      WHERE request_type = 'Maintenance' AND status = 'Approved' ${dateFilter}
    `, params);
    
    // Get costs by vehicle
    const [costsByVehicle] = await pool.query(`
      SELECT 
        vp.plate_number,
        SUM(CASE WHEN fmr.request_type = 'Fuel' AND fmr.status = 'Approved' THEN fmr.amount ELSE 0 END) as fuel_cost,
        SUM(CASE WHEN fmr.request_type = 'Maintenance' AND fmr.status = 'Approved' THEN fmr.amount ELSE 0 END) as maintenance_cost,
        SUM(CASE WHEN fmr.status = 'Approved' THEN fmr.amount ELSE 0 END) as total_cost
      FROM fuel_maintenance_requests fmr
      JOIN number_plates vp ON fmr.vehicle_plate = vp.plate_number
      WHERE fmr.status = 'Approved' ${dateFilter}
      GROUP BY vp.plate_number
      ORDER BY total_cost DESC
      LIMIT 10
    `, params);
    
    return res.status(200).json({
      success: true,
      message: "Financial reports retrieved successfully.",
      data: {
        fuelCosts: fuelCosts[0],
        maintenanceCosts: maintenanceCosts[0],
        costsByVehicle,
      },
    });
  } catch (error) {
    console.error("Get financial reports error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch financial reports.",
    });
  }
};

const getComplianceReports = async (req, res) => {
  try {
    // Get document status
    const [documentStatus] = await pool.query(`
      SELECT 
        document_type,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Valid' THEN 1 ELSE 0 END) as valid,
        SUM(CASE WHEN status = 'Expiring' THEN 1 ELSE 0 END) as expiring,
        SUM(CASE WHEN status = 'Expired' THEN 1 ELSE 0 END) as expired
      FROM compliance_documents
      GROUP BY document_type
    `);
    
    // Get documents expiring soon (within 30 days)
    const [expiringSoon] = await pool.query(`
      SELECT 
        cd.id,
        cd.document_type,
        cd.number_plate,
        cd.expiry_date,
        u.firstName,
        u.lastName
      FROM compliance_documents cd
      JOIN users u ON cd.uploaded_by_user_id = u.id
      WHERE cd.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
      ORDER BY cd.expiry_date ASC
    `);
    
    // Get audit logs for compliance-relevant actions
    const [complianceAudits] = await pool.query(`
      SELECT 
        al.domain,
        al.entityType,
        al.action,
        COUNT(*) as count,
        MAX(al.createdAt) as last_occurrence
      FROM audit_logs al
      WHERE al.complianceRelevant = 1
      GROUP BY al.domain, al.entityType, al.action
      ORDER BY count DESC
      LIMIT 20
    `);
    
    return res.status(200).json({
      success: true,
      message: "Compliance reports retrieved successfully.",
      data: {
        documentStatus,
        expiringSoon,
        complianceAudits,
      },
    });
  } catch (error) {
    console.error("Get compliance reports error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch compliance reports.",
    });
  }
};

const getStaffReports = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
      dateFilter = ` AND sa.created_at BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }
    
    // Get staff statistics
    const [staffStats] = await pool.query(`
      SELECT 
        role,
        COUNT(*) as total_staff,
        SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active_staff,
        SUM(CASE WHEN status = 'Inactive' THEN 1 ELSE 0 END) as inactive_staff
      FROM users
      WHERE role IN ('Driver', 'Bus Assistant')
      GROUP BY role
    `, params);
    
    // Get staff attendance
    const [staffAttendance] = await pool.query(`
      SELECT 
        u.firstName,
        u.lastName,
        u.role,
        COUNT(sa.id) as total_days,
        SUM(CASE WHEN sa.present = 1 THEN 1 ELSE 0 END) as days_present,
        ROUND((SUM(CASE WHEN sa.present = 1 THEN 1 ELSE 0 END) / COUNT(sa.id)) * 100, 2) as attendance_rate
      FROM staff_attendance sa
      JOIN users u ON sa.user_id = u.id
      WHERE 1=1 ${dateFilter}
      GROUP BY u.id, u.firstName, u.lastName, u.role
      ORDER BY attendance_rate DESC
    `, params);
    
    // Get incident reports by staff
    const [staffIncidents] = await pool.query(`
      SELECT 
        u.firstName,
        u.lastName,
        u.role,
        COUNT(ir.id) as incident_count
      FROM incident_reports ir
      JOIN users u ON ir.created_by_user_id = u.id
      WHERE 1=1 ${dateFilter}
      GROUP BY u.id, u.firstName, u.lastName, u.role
      ORDER BY incident_count DESC
    `, params);
    
    return res.status(200).json({
      success: true,
      message: "Staff reports retrieved successfully.",
      data: {
        staffStats,
        staffAttendance,
        staffIncidents,
      },
    });
  } catch (error) {
    console.error("Get staff reports error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch staff reports.",
    });
  }
};

module.exports = {
  getOperationalReports,
  getFinancialReports,
  getComplianceReports,
  getStaffReports,
};
