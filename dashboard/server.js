const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  database: 'hotel_revenue',
  waitForConnections: true,
  connectionLimit: 10
});

function renderTable(title, rows) {
  if (!rows || rows.length === 0) {
    return `<section><h2>${title}</h2><p class="empty">No rows found.</p></section>`;
  }
  const cols = Object.keys(rows[0]);
  const headers = cols.map(c => `<th>${c}</th>`).join('');
  const body = rows.map(r => `<tr>${cols.map(c => `<td>${r[c] instanceof Date ? r[c].toISOString().slice(0, 10) : (r[c] ?? '')}</td>`).join('')}</tr>`).join('');
  return `
    <section>
      <h2>${title} <span class="count">(${rows.length})</span></h2>
      <div class="table-wrap">
        <table>
          <thead><tr>${headers}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </section>
  `;
}

app.get('/', async (req, res) => {
  try {
    const [rooms] = await pool.query('SELECT * FROM rooms ORDER BY room_number');
    const [reservations] = await pool.query('SELECT * FROM reservations ORDER BY reservation_id DESC');
    const [payments] = await pool.query('SELECT * FROM payments ORDER BY payment_id DESC');
    const [monthlyRevenue] = await pool.query('SELECT * FROM monthly_revenue');

    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.payment_amount || 0), 0);
    const err = req.query.error ? `<div class="alert error">${req.query.error}</div>` : '';

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hotel Database System</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 32px; background: #0f172a; color: #e2e8f0; }
    h1 { margin: 0 0 8px; color: #38bdf8; }
    .subtitle { color: #94a3b8; margin: 0 0 24px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .stat { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 16px; }
    .stat-label { color: #94a3b8; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-value { font-size: 1.6rem; font-weight: 700; color: #f8fafc; margin-top: 6px; }
    .forms { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px; }
    section, .card { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 20px; margin-bottom: 24px; }
    .card { margin-bottom: 0; }
    h2 { color: #f8fafc; margin: 0 0 14px; font-size: 1.1rem; }
    .count { color: #94a3b8; font-weight: normal; font-size: 0.9rem; }
    form { display: flex; flex-direction: column; gap: 10px; }
    input, select, button { padding: 9px 11px; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: #e2e8f0; font-size: 0.9rem; }
    button { background: #0284c7; border-color: #0284c7; color: #fff; font-weight: 600; cursor: pointer; }
    button:hover { background: #0369a1; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #334155; }
    th { color: #94a3b8; text-transform: uppercase; font-size: 0.76rem; letter-spacing: 0.05em; }
    tr:hover td { background: #263449; }
    .empty { color: #94a3b8; font-style: italic; }
    .alert.error { background: #7f1d1d; border: 1px solid #ef4444; color: #fecaca; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>Hotel Database System</h1>
  <p class="subtitle">Mini Project &bull; MySQL (<code>hotel_revenue</code>) &bull; Running on <code>http://localhost:${PORT}</code></p>
  ${err}
  <div class="stats">
    <div class="stat"><div class="stat-label">Total Rooms</div><div class="stat-value">${rooms.length}</div></div>
    <div class="stat"><div class="stat-label">Reservations</div><div class="stat-value">${reservations.length}</div></div>
    <div class="stat"><div class="stat-label">Payments</div><div class="stat-value">${payments.length}</div></div>
    <div class="stat"><div class="stat-label">Total Revenue</div><div class="stat-value">$${totalRevenue.toFixed(2)}</div></div>
  </div>

  <div class="forms">
    <div class="card">
      <h2>Add Room</h2>
      <form method="POST" action="/rooms">
        <input name="room_number" type="number" placeholder="Room Number (e.g. 101)" required />
        <input name="room_type" type="text" placeholder="Room Type (e.g. Deluxe, Suite)" required />
        <input name="room_rate" type="number" step="0.01" placeholder="Rate per night (e.g. 150.00)" required />
        <button type="submit">Add Room</button>
      </form>
    </div>
    <div class="card">
      <h2>New Reservation</h2>
      <form method="POST" action="/reservations">
        <input name="reservation_id" type="number" placeholder="Reservation ID (e.g. 1)" required />
        <input name="guest_name" type="text" placeholder="Guest Name" required />
        <input name="room_number" type="number" placeholder="Room Number" required />
        <input name="check_in_date" type="date" required />
        <input name="check_out_date" type="date" required />
        <input name="total_cost" type="number" step="0.01" placeholder="Total Cost" required />
        <button type="submit">Create Reservation</button>
      </form>
    </div>
    <div class="card">
      <h2>Record Payment</h2>
      <form method="POST" action="/payments">
        <input name="payment_id" type="number" placeholder="Payment ID (e.g. 1)" required />
        <input name="reservation_id" type="number" placeholder="Reservation ID" required />
        <input name="payment_date" type="date" required />
        <input name="payment_amount" type="number" step="0.01" placeholder="Amount" required />
        <select name="payment_method" required>
          <option value="Credit Card">Credit Card</option>
          <option value="Cash">Cash</option>
          <option value="UPI">UPI</option>
          <option value="Bank Transfer">Bank Transfer</option>
        </select>
        <button type="submit">Record Payment</button>
      </form>
    </div>
  </div>

  ${renderTable('Rooms', rooms)}
  ${renderTable('Reservations', reservations)}
  ${renderTable('Payments', payments)}
  ${renderTable('Monthly Revenue (View)', monthlyRevenue)}
</body>
</html>`);
  } catch (err) {
    res.status(500).send(`<pre>Database error: ${err.message}</pre>`);
  }
});

app.post('/rooms', async (req, res) => {
  try {
    const { room_number, room_type, room_rate } = req.body;
    await pool.query('INSERT INTO rooms (room_number, room_type, room_rate) VALUES (?, ?, ?)', [room_number, room_type, room_rate]);
    res.redirect('/');
  } catch (err) {
    res.redirect('/?error=' + encodeURIComponent(err.message));
  }
});

app.post('/reservations', async (req, res) => {
  try {
    const { reservation_id, guest_name, check_in_date, check_out_date, room_number, total_cost } = req.body;
    await pool.query(
      'INSERT INTO reservations (reservation_id, guest_name, check_in_date, check_out_date, room_number, total_cost) VALUES (?, ?, ?, ?, ?, ?)',
      [reservation_id, guest_name, check_in_date, check_out_date, room_number, total_cost]
    );
    res.redirect('/');
  } catch (err) {
    res.redirect('/?error=' + encodeURIComponent(err.message));
  }
});

app.post('/payments', async (req, res) => {
  try {
    const { payment_id, reservation_id, payment_date, payment_amount, payment_method } = req.body;
    await pool.query(
      'INSERT INTO payments (payment_id, reservation_id, payment_date, payment_amount, payment_method) VALUES (?, ?, ?, ?, ?)',
      [payment_id, reservation_id, payment_date, payment_amount, payment_method]
    );
    res.redirect('/');
  } catch (err) {
    res.redirect('/?error=' + encodeURIComponent(err.message));
  }
});

app.listen(PORT, () => {
  console.log(`Hotel Database System running at http://localhost:${PORT}`);
});
