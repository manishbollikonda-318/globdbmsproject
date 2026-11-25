const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  database: 'hotel_revenue',
  waitForConnections: true,
  connectionLimit: 10
});

async function initSeed() {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) as cnt FROM rooms');
    if (rows[0].cnt === 0) {
      await pool.query(`
        INSERT INTO rooms (room_number, room_type, room_rate) VALUES
        (101, 'Standard Single Room', 2200.00),
        (102, 'Executive King Suite', 4500.00),
        (201, 'Deluxe Heritage View', 6800.00),
        (301, 'Presidential Royal Villa', 15000.00)
      `);
      await pool.query(`
        INSERT INTO reservations (reservation_id, guest_name, room_number, check_in_date, check_out_date, total_cost) VALUES
        (1, 'Aarav Sharma', 102, '2026-11-20', '2026-11-23', 13500.00),
        (2, 'Pooja Verma', 201, '2026-11-22', '2026-11-25', 20400.00)
      `);
      await pool.query(`
        INSERT INTO payments (payment_id, reservation_id, payment_date, payment_amount, payment_method) VALUES
        (1, 1, '2026-11-20', 13500.00, 'UPI / GPay / PhonePe'),
        (2, 2, '2026-11-22', 20400.00, 'Net Banking')
      `);
    }
  } catch (err) {
    console.error('Seed verification notice:', err.message);
  }
}
initSeed();

function escapeHTML(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

function formatINR(val) {
  const num = Number(val || 0);
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderTable(title, badge, rows, entityType) {
  if (!rows || rows.length === 0) {
    return `
      <div class="table-container">
        <div class="table-header-row">
          <h2>${title}</h2>
          <span class="table-tag">${badge} (0 records)</span>
        </div>
        <div class="empty-msg">No records found.</div>
      </div>
    `;
  }
  const cols = Object.keys(rows[0]);
  const headers = cols.map(c => `<th>${c.replace(/_/g, ' ')}</th>`).join('') + (entityType ? `<th>Action</th>` : '');
  const body = rows.map(r => {
    let actionBtn = '';
    if (entityType === 'rooms') {
      actionBtn = `
        <td>
          <form method="POST" action="/rooms/delete" onsubmit="return confirm('Delete Room #${r.room_number}? Linked reservations will also be deleted.')">
            <input type="hidden" name="room_number" value="${r.room_number}" />
            <button type="submit" class="delete-btn">Delete</button>
          </form>
        </td>`;
    } else if (entityType === 'reservations') {
      actionBtn = `
        <td>
          <form method="POST" action="/reservations/delete" onsubmit="return confirm('Delete Reservation #${r.reservation_id}? Payments will also be deleted.')">
            <input type="hidden" name="reservation_id" value="${r.reservation_id}" />
            <button type="submit" class="delete-btn">Delete</button>
          </form>
        </td>`;
    } else if (entityType === 'payments') {
      actionBtn = `
        <td>
          <form method="POST" action="/payments/delete" onsubmit="return confirm('Delete Payment #${r.payment_id}?')">
            <input type="hidden" name="payment_id" value="${r.payment_id}" />
            <button type="submit" class="delete-btn">Delete</button>
          </form>
        </td>`;
    }

    const cells = cols.map(c => {
      let val = r[c];
      if (val instanceof Date) {
        val = val.toISOString().slice(0, 10);
      }
      const isAmount = (c.includes('cost') || c.includes('rate') || c.includes('amount') || c.includes('revenue'));
      if (isAmount && !isNaN(val)) {
        return `<td class="amount-cell">${formatINR(val)}</td>`;
      }
      return `<td>${val ?? ''}</td>`;
    }).join('');

    return `<tr>${cells}${actionBtn}</tr>`;
  }).join('');

  return `
    <div class="table-container">
      <div class="table-header-row">
        <h2>${title}</h2>
        <span class="table-tag">${badge} &bull; ${rows.length} RECORD(S)</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>${headers}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </div>
  `;
}

app.get('/', async (req, res) => {
  try {
    const [rooms] = await pool.query('SELECT * FROM rooms ORDER BY room_number');
    const [reservations] = await pool.query('SELECT * FROM reservations ORDER BY reservation_id DESC');
    const [payments] = await pool.query('SELECT * FROM payments ORDER BY payment_id DESC');
    const [monthlyRevenue] = await pool.query('SELECT * FROM monthly_revenue');

    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.payment_amount || 0), 0);
    const errNotice = req.query.error ? `
      <div class="notice-box error">
        <div><strong>ERROR:</strong> ${escapeHTML(req.query.error)}</div>
        <button class="notice-close" onclick="this.parentElement.remove()">✕</button>
      </div>` : '';

    const successNotice = req.query.success ? `
      <div class="notice-box success">
        <div><strong>SUCCESS:</strong> ${escapeHTML(req.query.success)}</div>
        <button class="notice-close" onclick="this.parentElement.remove()">✕</button>
      </div>` : '';

    const roomOptions = rooms.map(r => `<option value="${r.room_number}">Room #${r.room_number} - ${r.room_type} (${formatINR(r.room_rate)}/nt)</option>`).join('');
    const resOptions = reservations.map(r => `<option value="${r.reservation_id}">Res #${r.reservation_id} (${escapeHTML(r.guest_name)}) - Total: ${formatINR(r.total_cost)}</option>`).join('');

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hotel Revenue System (INR)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #ffffff;
      --bg-alt: #f8fafc;
      --card-bg: #ffffff;
      --text-main: #09090b;
      --text-muted: #52525b;
      --text-dim: #71717a;
      --border-main: #e4e4e7;
      --border-dark: #18181b;
      --primary: #000000;
      --primary-hover: #27272a;
      --danger-bg: #fef2f2;
      --danger-border: #f87171;
      --danger-text: #991b1b;
      --success-bg: #f0fdf4;
      --success-border: #86efac;
      --success-text: #166534;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text-main);
      padding: 40px 24px;
      min-height: 100vh;
      line-height: 1.5;
    }
    .container { max-width: 1280px; margin: 0 auto; }
    header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 16px;
      padding-bottom: 24px;
      border-bottom: 2px solid var(--text-main);
      margin-bottom: 32px;
    }
    .brand-title {
      font-family: 'Cinzel', serif;
      font-size: 2.1rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: var(--text-main);
      text-transform: uppercase;
    }
    .brand-subtitle {
      color: var(--text-muted);
      font-size: 0.92rem;
      margin-top: 4px;
    }
    .header-badges { display: flex; gap: 10px; }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 999px;
      background: #000000;
      color: #ffffff;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .badge-outline { background: transparent; color: #000000; border: 1px solid #000000; }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 18px;
      margin-bottom: 32px;
    }
    .kpi-card {
      background: var(--card-bg);
      border: 1px solid var(--border-main);
      border-radius: 12px;
      padding: 22px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    }
    .kpi-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-dim); font-weight: 700; }
    .kpi-val { font-size: 2.1rem; font-weight: 800; color: var(--text-main); margin: 8px 0 4px; font-family: 'JetBrains Mono', monospace; }
    .kpi-hint { font-size: 0.8rem; color: var(--text-muted); }
    .notice-box {
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      font-size: 0.88rem;
      border: 1px solid;
    }
    .notice-box.error { background: var(--danger-bg); border-color: var(--danger-border); color: var(--danger-text); }
    .notice-box.success { background: var(--success-bg); border-color: var(--success-border); color: var(--success-text); }
    .notice-close { background: none; border: none; color: inherit; cursor: pointer; font-weight: bold; font-size: 1rem; }
    .forms-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 22px;
      margin-bottom: 36px;
    }
    .form-card {
      background: var(--card-bg);
      border: 1px solid var(--border-main);
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    }
    .form-card h2 {
      font-family: 'Cinzel', serif;
      font-size: 1.15rem;
      color: var(--text-main);
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .card-subtitle { font-size: 0.82rem; color: var(--text-muted); margin-bottom: 18px; }
    .entry-form { display: flex; flex-direction: column; gap: 12px; }
    .form-group { display: flex; flex-direction: column; gap: 5px; }
    .form-group label { font-size: 0.74rem; color: var(--text-main); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .input-field, .select-field {
      background: #ffffff;
      border: 1px solid var(--border-main);
      color: var(--text-main);
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.9rem;
      font-family: inherit;
    }
    .input-field:focus, .select-field:focus { outline: none; border-color: #000000; box-shadow: 0 0 0 1px #000000; }
    .submit-btn {
      background: #000000;
      border: 1px solid #000000;
      color: #ffffff;
      font-weight: 700;
      padding: 12px;
      border-radius: 8px;
      font-size: 0.85rem;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      transition: all 0.2s ease;
      margin-top: 6px;
    }
    .submit-btn:hover { background: var(--primary-hover); transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12); }
    .delete-btn {
      background: #ffffff;
      border: 1px solid #dc2626;
      color: #dc2626;
      font-weight: 600;
      font-size: 0.75rem;
      padding: 5px 10px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .delete-btn:hover {
      background: #dc2626;
      color: #ffffff;
    }
    .tables-section { display: flex; flex-direction: column; gap: 28px; }
    .table-container {
      background: #ffffff;
      border: 1px solid var(--border-main);
      border-radius: 12px;
      padding: 22px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    }
    .table-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .table-header-row h2 { font-family: 'Cinzel', serif; font-size: 1.15rem; color: var(--text-main); }
    .table-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 6px;
      background: var(--bg-alt);
      border: 1px solid var(--border-main);
      color: var(--text-main);
      text-transform: uppercase;
    }
    .table-wrap { overflow-x: auto; border-radius: 8px; border: 1px solid var(--border-main); }
    table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border-main); }
    th {
      background: #000000;
      color: #ffffff;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 600;
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: var(--bg-alt); }
    td.amount-cell { font-family: 'JetBrains Mono', monospace; color: #000000; font-weight: 700; }
    .empty-msg { text-align: center; color: var(--text-dim); padding: 24px; font-style: italic; }
    footer {
      margin-top: 50px;
      padding-top: 24px;
      border-top: 1px solid var(--border-main);
      text-align: center;
      color: var(--text-dim);
      font-size: 0.8rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <div class="brand-title">HOTEL REVENUE SYSTEM</div>
        <div class="brand-subtitle">Local MySQL Live Engine &bull; Relational Data Operations (INR ₹)</div>
      </div>
      <div class="header-badges">
        <div class="badge">Currency: INR (₹)</div>
        <div class="badge badge-outline">Port 3000</div>
      </div>
    </header>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Rooms</div>
        <div class="kpi-val">${rooms.length}</div>
        <div class="kpi-hint">Persisted in MySQL tables</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Active Bookings</div>
        <div class="kpi-val">${reservations.length}</div>
        <div class="kpi-hint">Foreign keys enforced</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Settled Payments</div>
        <div class="kpi-val">${payments.length}</div>
        <div class="kpi-hint">Transactions ledger</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Realized Revenue</div>
        <div class="kpi-val">${formatINR(totalRevenue)}</div>
        <div class="kpi-hint">Aggregated in Indian Rupees (₹)</div>
      </div>
    </div>

    ${errNotice}
    ${successNotice}

    <div class="forms-grid">
      <!-- Add Room Form -->
      <div class="form-card">
        <h2>Add Room <span class="table-tag">rooms</span></h2>
        <div class="card-subtitle">Enforces positive room number & trigger rate validation.</div>
        <form class="entry-form" method="POST" action="/rooms">
          <div class="form-group">
            <label>Room Number</label>
            <input name="room_number" type="number" class="input-field" placeholder="e.g. 401" required min="1" />
          </div>
          <div class="form-group">
            <label>Room Category</label>
            <input name="room_type" type="text" class="input-field" placeholder="e.g. Deluxe Suite" required maxlength="50" />
          </div>
          <div class="form-group">
            <label>Nightly Rate (₹ INR)</label>
            <input name="room_rate" type="number" step="0.01" class="input-field" placeholder="e.g. 3500.00" required />
          </div>
          <button type="submit" class="submit-btn">Add Room</button>
        </form>
      </div>

      <!-- Book Stay Form -->
      <div class="form-card">
        <h2>Book Stay <span class="table-tag">reservations</span></h2>
        <div class="card-subtitle">Guarantees referential foreign key integrity.</div>
        <form class="entry-form" method="POST" action="/reservations">
          <div class="form-group">
            <label>Reservation ID</label>
            <input name="reservation_id" type="number" class="input-field" placeholder="e.g. 10" required min="1" />
          </div>
          <div class="form-group">
            <label>Guest Full Name</label>
            <input name="guest_name" type="text" class="input-field" placeholder="e.g. Aarav Sharma" required maxlength="50" />
          </div>
          <div class="form-group">
            <label>Room Allocation</label>
            <select name="room_number" class="select-field" required>
              ${roomOptions}
            </select>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <div class="form-group">
              <label>Check-In Date</label>
              <input name="check_in_date" type="date" class="input-field" required />
            </div>
            <div class="form-group">
              <label>Check-Out Date</label>
              <input name="check_out_date" type="date" class="input-field" required />
            </div>
          </div>
          <div class="form-group">
            <label>Total Price (₹ INR)</label>
            <input name="total_cost" type="number" step="0.01" class="input-field" placeholder="e.g. 10500.00" required min="1" />
          </div>
          <button type="submit" class="submit-btn">Confirm Reservation</button>
        </form>
      </div>

      <!-- Payment Form -->
      <div class="form-card">
        <h2>Record Payment <span class="table-tag">payments</span></h2>
        <div class="card-subtitle">Foreign key constraint on reservation_id.</div>
        <form class="entry-form" method="POST" action="/payments">
          <div class="form-group">
            <label>Payment Receipt ID</label>
            <input name="payment_id" type="number" class="input-field" placeholder="e.g. 12" required min="1" />
          </div>
          <div class="form-group">
            <label>Linked Reservation</label>
            <select name="reservation_id" class="select-field" required>
              ${resOptions}
            </select>
          </div>
          <div class="form-group">
            <label>Transaction Date</label>
            <input name="payment_date" type="date" class="input-field" required />
          </div>
          <div class="form-group">
            <label>Amount (₹ INR)</label>
            <input name="payment_amount" type="number" step="0.01" class="input-field" placeholder="e.g. 10500.00" required min="0.01" />
          </div>
          <div class="form-group">
            <label>Payment Method</label>
            <select name="payment_method" class="select-field" required>
              <option value="UPI / GPay / PhonePe">UPI / GPay / PhonePe</option>
              <option value="Net Banking">Net Banking</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Cash">Cash</option>
            </select>
          </div>
          <button type="submit" class="submit-btn">Process Payment</button>
        </form>
      </div>
    </div>

    <div class="tables-section">
      ${renderTable('Rooms Registry', 'TABLE: rooms', rooms, 'rooms')}
      ${renderTable('Reservations Ledger', 'TABLE: reservations', reservations, 'reservations')}
      ${renderTable('Payments Ledger', 'TABLE: payments', payments, 'payments')}
      ${renderTable('Monthly Revenue Projection', 'VIEW: monthly_revenue', monthlyRevenue, null)}
    </div>

    <footer>
      Hotel Revenue Database Management System &bull; Full INR Currency & Deletion Engine &bull; Port 3000
    </footer>
  </div>
</body>
</html>`);
  } catch (err) {
    res.status(500).send(`<pre>Database error: ${err.message}</pre>`);
  }
});

// Create Room
app.post('/rooms', async (req, res) => {
  try {
    const { room_number, room_type, room_rate } = req.body;
    const num = parseInt(room_number, 10);
    const rate = parseFloat(room_rate);

    if (isNaN(num) || num <= 0) {
      return res.redirect('/?error=' + encodeURIComponent('Room number must be a positive integer.'));
    }
    if (isNaN(rate) || rate <= 0) {
      return res.redirect('/?error=' + encodeURIComponent('Room rate cannot be negative or zero (Trigger constraint check_room_rate).'));
    }

    await pool.query(
      'INSERT INTO rooms (room_number, room_type, room_rate) VALUES (?, ?, ?)',
      [num, escapeHTML(room_type.trim()), rate]
    );
    res.redirect('/?success=' + encodeURIComponent(`Room #${num} added successfully.`));
  } catch (err) {
    res.redirect('/?error=' + encodeURIComponent(err.message));
  }
});

// Delete Room (Cascade delete linked payments and reservations)
app.post('/rooms/delete', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { room_number } = req.body;
    const num = parseInt(room_number, 10);

    await conn.beginTransaction();

    // Find linked reservations
    const [reservations] = await conn.query('SELECT reservation_id FROM reservations WHERE room_number = ?', [num]);
    const resIds = reservations.map(r => r.reservation_id);

    if (resIds.length > 0) {
      // Delete child payments first
      await conn.query('DELETE FROM payments WHERE reservation_id IN (?)', [resIds]);
      // Delete reservations
      await conn.query('DELETE FROM reservations WHERE room_number = ?', [num]);
    }

    // Delete room
    await conn.query('DELETE FROM rooms WHERE room_number = ?', [num]);

    await conn.commit();
    res.redirect('/?success=' + encodeURIComponent(`Room #${num} and linked reservations were deleted.`));
  } catch (err) {
    await conn.rollback();
    res.redirect('/?error=' + encodeURIComponent(err.message));
  } finally {
    conn.release();
  }
});

// Create Reservation
app.post('/reservations', async (req, res) => {
  try {
    const { reservation_id, guest_name, check_in_date, check_out_date, room_number, total_cost } = req.body;
    const resId = parseInt(reservation_id, 10);
    const roomNum = parseInt(room_number, 10);
    const cost = parseFloat(total_cost);

    if (new Date(check_in_date) >= new Date(check_out_date)) {
      return res.redirect('/?error=' + encodeURIComponent('Chronological Error: Check-out date must be after check-in date.'));
    }
    if (isNaN(cost) || cost <= 0) {
      return res.redirect('/?error=' + encodeURIComponent('Total cost must be a positive number.'));
    }

    await pool.query(
      'INSERT INTO reservations (reservation_id, guest_name, check_in_date, check_out_date, room_number, total_cost) VALUES (?, ?, ?, ?, ?, ?)',
      [resId, escapeHTML(guest_name.trim()), check_in_date, check_out_date, roomNum, cost]
    );
    res.redirect('/?success=' + encodeURIComponent(`Reservation #${resId} created for ${guest_name}.`));
  } catch (err) {
    res.redirect('/?error=' + encodeURIComponent(err.message));
  }
});

// Delete Reservation
app.post('/reservations/delete', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { reservation_id } = req.body;
    const resId = parseInt(reservation_id, 10);

    await conn.beginTransaction();
    // Delete payments first
    await conn.query('DELETE FROM payments WHERE reservation_id = ?', [resId]);
    // Delete reservation
    await conn.query('DELETE FROM reservations WHERE reservation_id = ?', [resId]);
    await conn.commit();

    res.redirect('/?success=' + encodeURIComponent(`Reservation #${resId} and associated payments deleted.`));
  } catch (err) {
    await conn.rollback();
    res.redirect('/?error=' + encodeURIComponent(err.message));
  } finally {
    conn.release();
  }
});

// Create Payment
app.post('/payments', async (req, res) => {
  try {
    const { payment_id, reservation_id, payment_date, payment_amount, payment_method } = req.body;
    const payId = parseInt(payment_id, 10);
    const resId = parseInt(reservation_id, 10);
    const amount = parseFloat(payment_amount);

    if (isNaN(amount) || amount <= 0) {
      return res.redirect('/?error=' + encodeURIComponent('Payment amount must be greater than ₹0.00.'));
    }

    await pool.query(
      'INSERT INTO payments (payment_id, reservation_id, payment_date, payment_amount, payment_method) VALUES (?, ?, ?, ?, ?)',
      [payId, resId, payment_date, amount, escapeHTML(payment_method)]
    );
    res.redirect('/?success=' + encodeURIComponent(`Payment #${payId} of ${formatINR(amount)} recorded.`));
  } catch (err) {
    res.redirect('/?error=' + encodeURIComponent(err.message));
  }
});

// Delete Payment
app.post('/payments/delete', async (req, res) => {
  try {
    const { payment_id } = req.body;
    const payId = parseInt(payment_id, 10);

    await pool.query('DELETE FROM payments WHERE payment_id = ?', [payId]);
    res.redirect('/?success=' + encodeURIComponent(`Payment #${payId} deleted.`));
  } catch (err) {
    res.redirect('/?error=' + encodeURIComponent(err.message));
  }
});

app.listen(PORT, () => {
  console.log(`Hotel Revenue System running at http://localhost:${PORT}`);
});
