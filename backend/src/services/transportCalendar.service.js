const pool = require('../config/db.js');

/**
 * Evaluate whether transport is enabled for the given date.
 * Returns an object: { transportEnabled: boolean, source: string }
 */
const isTransportDay = async (dateStr) => {
  const date = dateStr || new Date().toISOString().slice(0, 10);

  // 1. Holiday overrides (explicit single-day override)
  const [holidayRows] = await pool.query(
    'SELECT * FROM holiday_overrides WHERE date = ? LIMIT 1',
    [date]
  );
  if (holidayRows.length > 0) {
    return { transportEnabled: !!holidayRows[0].transport_enabled, source: 'holiday_override' };
  }

  // 2. Special transport days (make-up days)
  const [specialRows] = await pool.query(
    'SELECT * FROM special_transport_days WHERE date = ? LIMIT 1',
    [date]
  );
  if (specialRows.length > 0) {
    return { transportEnabled: !!specialRows[0].transport_enabled, source: 'special_transport_day' };
  }

  // 3. Calendar events (holidays/closures/special events spanning ranges)
  const [eventRows] = await pool.query(
    `SELECT * FROM transport_calendar_events
     WHERE start_date <= ? AND end_date >= ? AND deleted_at IS NULL`,
    [date, date]
  );

  if (eventRows.length > 0) {
    // If any event explicitly disables transport, consider it a no-transport day.
    const anyDisable = eventRows.some((e) => e.transport_enabled === 0 || e.transport_enabled === false);
    const anyEnable = eventRows.some((e) => e.transport_enabled === 1 || e.transport_enabled === true);
    if (anyDisable && !anyEnable) return { transportEnabled: false, source: 'calendar_event_disabled' };
    if (anyEnable && !anyDisable) return { transportEnabled: true, source: 'calendar_event_enabled' };
    // If mixed, prefer disable to be safe
    if (anyDisable) return { transportEnabled: false, source: 'calendar_event_mixed' };
  }

  // 4. Academic term presence and its transport_enabled flag
  const [terms] = await pool.query(
    `SELECT * FROM academic_terms
     WHERE start_date <= ? AND end_date >= ? AND deleted_at IS NULL
     LIMIT 1`,
    [date, date]
  );

  if (terms.length === 0) {
    return { transportEnabled: false, source: 'no_active_term' };
  }

  const term = terms[0];
  if (!term.transport_enabled) return { transportEnabled: false, source: 'term_transport_disabled' };

  // 5. Weekday operating days for the academic year
  const academicYearId = term.academic_year_id;
  const weekday = new Date(date).getDay(); // 0 = Sun, 6 = Sat

  const [opRows] = await pool.query(
    `SELECT * FROM transport_operating_days
     WHERE academic_year_id = ? AND weekday = ?
     LIMIT 1`,
    [academicYearId, weekday]
  );

  if (opRows.length > 0) {
    return { transportEnabled: !!opRows[0].enabled, source: 'weekday_config' };
  }

  // Default: Mon-Fri enabled
  const defaultEnabled = weekday >= 1 && weekday <= 5;
  return { transportEnabled: defaultEnabled, source: 'default_weekday' };
};

// ==================== Academic Years CRUD ====================

const listAcademicYears = async () => {
  const [rows] = await pool.query(
    'SELECT * FROM academic_years WHERE deleted_at IS NULL ORDER BY start_date DESC'
  );
  return rows;
};

const getAcademicYear = async (id) => {
  const [rows] = await pool.query(
    'SELECT * FROM academic_years WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [id]
  );
  return rows[0] || null;
};

const createAcademicYear = async ({ name, startDate, endDate, status = 'Active' }) => {
  const [result] = await pool.query(
    'INSERT INTO academic_years (name, start_date, end_date, status) VALUES (?, ?, ?, ?)',
    [name, startDate, endDate, status]
  );
  return getAcademicYear(result.insertId);
};

const updateAcademicYear = async (id, { name, startDate, endDate, status }) => {
  const updates = [];
  const values = [];

  if (name !== undefined) {
    updates.push('name = ?');
    values.push(name);
  }
  if (startDate !== undefined) {
    updates.push('start_date = ?');
    values.push(startDate);
  }
  if (endDate !== undefined) {
    updates.push('end_date = ?');
    values.push(endDate);
  }
  if (status !== undefined) {
    updates.push('status = ?');
    values.push(status);
  }

  if (updates.length === 0) return getAcademicYear(id);

  values.push(id);
  await pool.query(
    `UPDATE academic_years SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
  return getAcademicYear(id);
};

const deleteAcademicYear = async (id) => {
  await pool.query(
    'UPDATE academic_years SET deleted_at = NOW() WHERE id = ?',
    [id]
  );
  return { message: 'Academic year deleted successfully' };
};

// ==================== Academic Terms CRUD ====================

const listAcademicTerms = async ({ academicYearId } = {}) => {
  let query = 'SELECT * FROM academic_terms WHERE deleted_at IS NULL';
  const params = [];

  if (academicYearId) {
    query += ' AND academic_year_id = ?';
    params.push(academicYearId);
  }

  query += ' ORDER BY start_date DESC';
  const [rows] = await pool.query(query, params);
  return rows;
};

const getAcademicTerm = async (id) => {
  const [rows] = await pool.query(
    'SELECT * FROM academic_terms WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [id]
  );
  return rows[0] || null;
};

const createAcademicTerm = async ({ academicYearId, name, startDate, endDate, transportEnabled = true, status = 'Active' }) => {
  const [result] = await pool.query(
    'INSERT INTO academic_terms (academic_year_id, name, start_date, end_date, transport_enabled, status) VALUES (?, ?, ?, ?, ?, ?)',
    [academicYearId, name, startDate, endDate, transportEnabled ? 1 : 0, status]
  );
  return getAcademicTerm(result.insertId);
};

const updateAcademicTerm = async (id, { academicYearId, name, startDate, endDate, transportEnabled, status }) => {
  const updates = [];
  const values = [];

  if (academicYearId !== undefined) {
    updates.push('academic_year_id = ?');
    values.push(academicYearId);
  }
  if (name !== undefined) {
    updates.push('name = ?');
    values.push(name);
  }
  if (startDate !== undefined) {
    updates.push('start_date = ?');
    values.push(startDate);
  }
  if (endDate !== undefined) {
    updates.push('end_date = ?');
    values.push(endDate);
  }
  if (transportEnabled !== undefined) {
    updates.push('transport_enabled = ?');
    values.push(transportEnabled ? 1 : 0);
  }
  if (status !== undefined) {
    updates.push('status = ?');
    values.push(status);
  }

  if (updates.length === 0) return getAcademicTerm(id);

  values.push(id);
  await pool.query(
    `UPDATE academic_terms SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
  return getAcademicTerm(id);
};

const deleteAcademicTerm = async (id) => {
  await pool.query(
    'UPDATE academic_terms SET deleted_at = NOW() WHERE id = ?',
    [id]
  );
  return { message: 'Academic term deleted successfully' };
};

// ==================== Transport Calendar Events CRUD ====================

const listCalendarEvents = async ({ academicYearId, academicTermId, startDate, endDate } = {}) => {
  let query = 'SELECT * FROM transport_calendar_events WHERE deleted_at IS NULL';
  const params = [];

  if (academicYearId) {
    query += ' AND academic_year_id = ?';
    params.push(academicYearId);
  }
  if (academicTermId) {
    query += ' AND academic_term_id = ?';
    params.push(academicTermId);
  }
  if (startDate) {
    query += ' AND start_date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND end_date <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY start_date ASC';
  const [rows] = await pool.query(query, params);
  return rows;
};

const getCalendarEvent = async (id) => {
  const [rows] = await pool.query(
    'SELECT * FROM transport_calendar_events WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [id]
  );
  return rows[0] || null;
};

const createCalendarEvent = async ({ academicYearId, academicTermId, name, eventType, startDate, endDate, transportEnabled = true, description }) => {
  const [result] = await pool.query(
    'INSERT INTO transport_calendar_events (academic_year_id, academic_term_id, name, event_type, start_date, end_date, transport_enabled, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [academicYearId || null, academicTermId || null, name, eventType, startDate, endDate, transportEnabled ? 1 : 0, description || null]
  );
  return getCalendarEvent(result.insertId);
};

const updateCalendarEvent = async (id, { academicYearId, academicTermId, name, eventType, startDate, endDate, transportEnabled, description }) => {
  const updates = [];
  const values = [];

  if (academicYearId !== undefined) {
    updates.push('academic_year_id = ?');
    values.push(academicYearId);
  }
  if (academicTermId !== undefined) {
    updates.push('academic_term_id = ?');
    values.push(academicTermId);
  }
  if (name !== undefined) {
    updates.push('name = ?');
    values.push(name);
  }
  if (eventType !== undefined) {
    updates.push('event_type = ?');
    values.push(eventType);
  }
  if (startDate !== undefined) {
    updates.push('start_date = ?');
    values.push(startDate);
  }
  if (endDate !== undefined) {
    updates.push('end_date = ?');
    values.push(endDate);
  }
  if (transportEnabled !== undefined) {
    updates.push('transport_enabled = ?');
    values.push(transportEnabled ? 1 : 0);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    values.push(description);
  }

  if (updates.length === 0) return getCalendarEvent(id);

  values.push(id);
  await pool.query(
    `UPDATE transport_calendar_events SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
  return getCalendarEvent(id);
};

const deleteCalendarEvent = async (id) => {
  await pool.query(
    'UPDATE transport_calendar_events SET deleted_at = NOW() WHERE id = ?',
    [id]
  );
  return { message: 'Calendar event deleted successfully' };
};

// ==================== Holiday Overrides CRUD ====================

const listHolidayOverrides = async ({ startDate, endDate } = {}) => {
  let query = 'SELECT * FROM holiday_overrides';
  const params = [];

  if (startDate) {
    query += ' WHERE date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += startDate ? ' AND date <= ?' : ' WHERE date <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY date ASC';
  const [rows] = await pool.query(query, params);
  return rows;
};

const getHolidayOverride = async (date) => {
  const [rows] = await pool.query(
    'SELECT * FROM holiday_overrides WHERE date = ? LIMIT 1',
    [date]
  );
  return rows[0] || null;
};

const createHolidayOverride = async ({ date, transportEnabled = false, reason }) => {
  const [result] = await pool.query(
    'INSERT INTO holiday_overrides (date, transport_enabled, reason) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE transport_enabled = VALUES(transport_enabled), reason = VALUES(reason)',
    [date, transportEnabled ? 1 : 0, reason || null]
  );
  return getHolidayOverride(date);
};

const updateHolidayOverride = async (date, { transportEnabled, reason }) => {
  const updates = [];
  const values = [];

  if (transportEnabled !== undefined) {
    updates.push('transport_enabled = ?');
    values.push(transportEnabled ? 1 : 0);
  }
  if (reason !== undefined) {
    updates.push('reason = ?');
    values.push(reason);
  }

  if (updates.length === 0) return getHolidayOverride(date);

  values.push(date);
  await pool.query(
    `UPDATE holiday_overrides SET ${updates.join(', ')} WHERE date = ?`,
    values
  );
  return getHolidayOverride(date);
};

const deleteHolidayOverride = async (date) => {
  await pool.query(
    'DELETE FROM holiday_overrides WHERE date = ?',
    [date]
  );
  return { message: 'Holiday override deleted successfully' };
};

// ==================== Special Transport Days CRUD ====================

const listSpecialTransportDays = async ({ startDate, endDate } = {}) => {
  let query = 'SELECT * FROM special_transport_days';
  const params = [];

  if (startDate) {
    query += ' WHERE date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += startDate ? ' AND date <= ?' : ' WHERE date <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY date ASC';
  const [rows] = await pool.query(query, params);
  return rows;
};

const getSpecialTransportDay = async (date) => {
  const [rows] = await pool.query(
    'SELECT * FROM special_transport_days WHERE date = ? LIMIT 1',
    [date]
  );
  return rows[0] || null;
};

const createSpecialTransportDay = async ({ date, transportEnabled = true, reason }) => {
  const [result] = await pool.query(
    'INSERT INTO special_transport_days (date, transport_enabled, reason) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE transport_enabled = VALUES(transport_enabled), reason = VALUES(reason)',
    [date, transportEnabled ? 1 : 0, reason || null]
  );
  return getSpecialTransportDay(date);
};

const updateSpecialTransportDay = async (date, { transportEnabled, reason }) => {
  const updates = [];
  const values = [];

  if (transportEnabled !== undefined) {
    updates.push('transport_enabled = ?');
    values.push(transportEnabled ? 1 : 0);
  }
  if (reason !== undefined) {
    updates.push('reason = ?');
    values.push(reason);
  }

  if (updates.length === 0) return getSpecialTransportDay(date);

  values.push(date);
  await pool.query(
    `UPDATE special_transport_days SET ${updates.join(', ')} WHERE date = ?`,
    values
  );
  return getSpecialTransportDay(date);
};

const deleteSpecialTransportDay = async (date) => {
  await pool.query(
    'DELETE FROM special_transport_days WHERE date = ?',
    [date]
  );
  return { message: 'Special transport day deleted successfully' };
};

// ==================== Transport Operating Days CRUD ====================

const listTransportOperatingDays = async ({ academicYearId } = {}) => {
  let query = 'SELECT * FROM transport_operating_days';
  const params = [];

  if (academicYearId) {
    query += ' WHERE academic_year_id = ?';
    params.push(academicYearId);
  }

  query += ' ORDER BY weekday ASC';
  const [rows] = await pool.query(query, params);
  return rows;
};

const getTransportOperatingDay = async ({ academicYearId, weekday }) => {
  const [rows] = await pool.query(
    'SELECT * FROM transport_operating_days WHERE academic_year_id = ? AND weekday = ? LIMIT 1',
    [academicYearId, weekday]
  );
  return rows[0] || null;
};

const createOrUpdateTransportOperatingDay = async ({ academicYearId, weekday, enabled = true }) => {
  const [result] = await pool.query(
    'INSERT INTO transport_operating_days (academic_year_id, weekday, enabled) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)',
    [academicYearId, weekday, enabled ? 1 : 0]
  );
  return getTransportOperatingDay({ academicYearId, weekday });
};

const deleteTransportOperatingDay = async ({ academicYearId, weekday }) => {
  await pool.query(
    'DELETE FROM transport_operating_days WHERE academic_year_id = ? AND weekday = ?',
    [academicYearId, weekday]
  );
  return { message: 'Transport operating day deleted successfully' };
};

module.exports = {
  isTransportDay,
  // Academic Years
  listAcademicYears,
  getAcademicYear,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  // Academic Terms
  listAcademicTerms,
  getAcademicTerm,
  createAcademicTerm,
  updateAcademicTerm,
  deleteAcademicTerm,
  // Calendar Events
  listCalendarEvents,
  getCalendarEvent,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  // Holiday Overrides
  listHolidayOverrides,
  getHolidayOverride,
  createHolidayOverride,
  updateHolidayOverride,
  deleteHolidayOverride,
  // Special Transport Days
  listSpecialTransportDays,
  getSpecialTransportDay,
  createSpecialTransportDay,
  updateSpecialTransportDay,
  deleteSpecialTransportDay,
  // Operating Days
  listTransportOperatingDays,
  getTransportOperatingDay,
  createOrUpdateTransportOperatingDay,
  deleteTransportOperatingDay,
};
