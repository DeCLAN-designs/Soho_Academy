const pool = require('../config/db.js');

// Academic Years CRUD (minimal)
const listAcademicYears = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM academic_years WHERE deleted_at IS NULL ORDER BY start_date ASC');
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('listAcademicYears error', err);
    return res.status(500).json({ success: false, message: 'Failed to list academic years' });
  }
};

const createAcademicYear = async (req, res) => {
  try {
    const { name, start_date, end_date } = req.body || {};
    if (!name || !start_date || !end_date) return res.status(400).json({ success: false, message: 'Missing fields: name, start_date, end_date are required' });
    const s = new Date(start_date);
    const e = new Date(end_date);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return res.status(400).json({ success: false, message: 'Invalid date format for start_date or end_date' });
    if (e < s) return res.status(400).json({ success: false, message: 'end_date must be the same or after start_date' });

    const [result] = await pool.query(
      'INSERT INTO academic_years (name, start_date, end_date) VALUES (?, ?, ?)',
      [name, start_date, end_date]
    );

    const [rows] = await pool.query('SELECT * FROM academic_years WHERE id = ? LIMIT 1', [result.insertId]);
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('createAcademicYear error', err);
    return res.status(500).json({ success: false, message: 'Failed to create academic year' });
  }
};

// Terms: minimal list/create
const listTerms = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM academic_terms WHERE deleted_at IS NULL ORDER BY start_date ASC');
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('listTerms error', err);
    return res.status(500).json({ success: false, message: 'Failed to list terms' });
  }
};

const createTerm = async (req, res) => {
  try {
    const { academic_year_id, name, start_date, end_date, transport_enabled } = req.body || {};
    if (!academic_year_id || !name || !start_date || !end_date) return res.status(400).json({ success: false, message: 'Missing fields: academic_year_id, name, start_date, end_date are required' });
    const s = new Date(start_date);
    const e = new Date(end_date);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return res.status(400).json({ success: false, message: 'Invalid date format for start_date or end_date' });
    if (e < s) return res.status(400).json({ success: false, message: 'end_date must be the same or after start_date' });

    const [result] = await pool.query(
      'INSERT INTO academic_terms (academic_year_id, name, start_date, end_date, transport_enabled) VALUES (?, ?, ?, ?, ?)',
      [academic_year_id, name, start_date, end_date, transport_enabled ? 1 : 0]
    );

    const [rows] = await pool.query('SELECT * FROM academic_terms WHERE id = ? LIMIT 1', [result.insertId]);
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('createTerm error', err);
    return res.status(500).json({ success: false, message: 'Failed to create term' });
  }
};

// Calendar events (list/create minimal)
const listEvents = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM transport_calendar_events WHERE deleted_at IS NULL ORDER BY start_date ASC');
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('listEvents error', err);
    return res.status(500).json({ success: false, message: 'Failed to list events' });
  }
};

const createEvent = async (req, res) => {
  try {
    const { academic_year_id, academic_term_id, name, event_type, start_date, end_date, transport_enabled, description } = req.body || {};
    if (!name || !event_type || !start_date || !end_date) return res.status(400).json({ success: false, message: 'Missing fields: name, event_type, start_date, end_date are required' });
    const allowed = ['half-term','mid-term','holiday','public-holiday','closure','makeup','exam','sports','custom'];
    if (!allowed.includes(event_type)) return res.status(400).json({ success: false, message: `Invalid event_type. Allowed: ${allowed.join(', ')}` });
    const s = new Date(start_date);
    const e = new Date(end_date);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return res.status(400).json({ success: false, message: 'Invalid date format for start_date or end_date' });
    if (e < s) return res.status(400).json({ success: false, message: 'end_date must be the same or after start_date' });

    const [result] = await pool.query(
      `INSERT INTO transport_calendar_events (academic_year_id, academic_term_id, name, event_type, start_date, end_date, transport_enabled, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [academic_year_id || null, academic_term_id || null, name, event_type, start_date, end_date, transport_enabled ? 1 : 0, description || null]
    );

    const [rows] = await pool.query('SELECT * FROM transport_calendar_events WHERE id = ? LIMIT 1', [result.insertId]);
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('createEvent error', err);
    return res.status(500).json({ success: false, message: 'Failed to create event' });
  }
};

module.exports = {
  listAcademicYears,
  createAcademicYear,
  listTerms,
  createTerm,
  listEvents,
  createEvent,
};
