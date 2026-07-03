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

module.exports = {
  isTransportDay,
};
