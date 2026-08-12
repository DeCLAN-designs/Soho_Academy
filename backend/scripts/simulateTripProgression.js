const fetch = require('node-fetch');
const { createAccessToken } = require('../src/utils/token');

const API = process.env.API_URL || 'http://localhost:5000/api';

const adminToken = createAccessToken({ sub: 1, role: 'Admin' });
const driverToken = createAccessToken({ sub: 2, role: 'Driver' });

const run = async () => {
  // 1. Create trip
  let res = await fetch(`${API}/trips`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ routeId: 1, departureTime: new Date(Date.now()+3600000).toISOString(), expectedReturnTime: new Date(Date.now()+7200000).toISOString(), vehiclePlate: 'SIM-1', driverName: 'Sim Driver' })
  });
  const created = await res.json();
  console.log('Created', created);
  const tripId = created.data.id || created.data.tripId || created.data.trip_id;

  // 2. Mark Ready
  res = await fetch(`${API}/trips/${tripId}/status`, { method: 'POST', headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Ready' }) });
  console.log('Marked Ready', await res.json());

  // 3. Driver marks In Progress
  res = await fetch(`${API}/trips/${tripId}/status`, { method: 'POST', headers: { 'Authorization': `Bearer ${driverToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'In Progress' }) });
  console.log('Marked In Progress', await res.json());

  // 4. Driver marks Returned
  res = await fetch(`${API}/trips/${tripId}/status`, { method: 'POST', headers: { 'Authorization': `Bearer ${driverToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Returned' }) });
  console.log('Marked Returned', await res.json());
};

run().catch((e) => { console.error(e); process.exit(1); });
