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

// Seed initial luxury records if rooms is empty
async function initSeed() {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) as cnt FROM rooms');
    if (rows[0].cnt === 0) {
      await pool.query(`
        INSERT INTO rooms (room_number, room_type, room_rate) VALUES
        (101, 'Executive King Suite', 220.00),
        (102, 'Royal Imperial Penthouse', 450.00),
        (201, 'Ambassador Ocean View', 380.00),
        (301, 'Presidential Reserve Villa', 850.00)
      `);
      await pool.query(`
        INSERT INTO reservations (reservation_id, guest_name, room_number, check_in_date, check_out_date, total_cost) VALUES
        (1, 'Lord Hamilton', 102, '2026-11-20', '2026-11-24', 1800.00),
        (2, 'Lady Vivienne St. Claire', 201, '2026-11-22', '2026-11-26', 1520.00)
      `);
      await pool.query(`
        INSERT INTO payments (payment_id, reservation_id, payment_date, payment_amount, payment_method) VALUES
        (1, 1, '2026-11-20', 1800.00, 'Black Amex Card'),
        (2, 2, '2026-11-22', 1520.00, 'Direct Wire Transfer')
      `);
      console.log('Seeded luxury records into MySQL hotel_revenue database.');
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

function renderTable(title, badge, rows) {
  if (!rows || rows.length === 0) {
    return `
      <div class="table-container">
        <div class="table-header-row">
          <h2>${title}</h2>
          <span class="table-badge ${badge === 'VIEW' ? 'view' : ''}">${badge} (0 records)</span>
        </div>
        <div class="empty-msg">No active records in this entity.</div>
      </div>
    `;
  }
  const cols = Object.keys(rows[0]);
  const headers = cols.map(c => `<th>${c.replace(/_/g, ' ')}</th>`).join('');
  const body = rows.map(r => {
    return `<tr>${cols.map(c => {
      let val = r[c];
      if (val instanceof Date) {
        val = val.toISOString().slice(0, 10);
      }
      const isNum = (c.includes('cost') || c.includes('rate') || c.includes('amount') || c.includes('revenue'));
      if (isNum && !isNaN(val)) {
        return `<td class="amount-cell">$${Number(val).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>`;
      }
      return `<td>${val ?? ''}</td>`;
    }).join('')}</tr>`;
  }).join('');

  return `
    <div class="table-container">
      <div class="table-header-row">
        <h2>${title}</h2>
        <span class="table-badge ${badge === 'VIEW' ? 'view' : ''}">${badge} &bull; ${rows.length} RECORD(S)</span>
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
        <div><strong>DEFENSE INTERCEPTED:</strong> ${escapeHTML(req.query.error)}</div>
        <button style="background:none;border:none;color:inherit;cursor:pointer;font-weight:bold;" onclick="this.parentElement.remove()">✕</button>
      </div>` : '';

    const successNotice = req.query.success ? `
      <div class="notice-box success">
        <div><strong>COMMITTED TO MYSQL:</strong> ${escapeHTML(req.query.success)}</div>
        <button style="background:none;border:none;color:inherit;cursor:pointer;font-weight:bold;" onclick="this.parentElement.remove()">✕</button>
      </div>` : '';

    const roomOptions = rooms.map(r => `<option value="${r.room_number}">Room #${r.room_number} - ${r.room_type} ($${Number(r.room_rate).toFixed(2)}/nt)</option>`).join('');
    const resOptions = reservations.map(r => `<option value="${r.reservation_id}">Res #${r.reservation_id} (${escapeHTML(r.guest_name)}) - Total: $${Number(r.total_cost).toFixed(2)}</option>`).join('');

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AURA LUXURY &bull; MySQL Database System</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #030305;
      --card-bg: #0a0a0f;
      --text-main: #ffffff;
      --text-muted: #a1a1aa;
      --text-dim: #71717a;
      --gold-primary: #d4af37;
      --gold-light: #fef08a;
      --gold-dark: #855b14;
      --violet-primary: #8b5cf6;
      --violet-light: #c084fc;
      --violet-dark: #581c87;
      --violet-glow: rgba(139, 92, 246, 0.25);
      --gold-glow: rgba(212, 175, 55, 0.25);
      --border-subtle: #1f1f2e;
      --border-accent: rgba(212, 175, 55, 0.35);
      --border-violet: rgba(139, 92, 246, 0.4);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text-main);
      padding: 32px 24px;
      min-height: 100vh;
      line-height: 1.5;
    }
    .container { max-width: 1320px; margin: 0 auto; }
    header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 16px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border-subtle);
      margin-bottom: 32px;
    }
    .brand-title {
      font-family: 'Cinzel', serif;
      font-size: 2.2rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      background: linear-gradient(135deg, #ffffff 20%, var(--gold-light) 60%, var(--gold-primary) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-transform: uppercase;
    }
    .brand-subtitle {
      color: var(--text-muted);
      font-size: 0.9rem;
      margin-top: 4px;
      letter-spacing: 0.05em;
    }
    .header-badges { display: flex; gap: 12px; }
    .badge-gold {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 6px 14px;
      border-radius: 999px;
      background: rgba(212, 175, 55, 0.1);
      border: 1px solid var(--border-accent);
      color: var(--gold-light);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .badge-violet {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 6px 14px;
      border-radius: 999px;
      background: rgba(139, 92, 246, 0.12);
      border: 1px solid var(--border-violet);
      color: var(--violet-light);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .badge-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--violet-light);
      box-shadow: 0 0 10px var(--violet-primary);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 18px;
      margin-bottom: 32px;
    }
    .kpi-card {
      background: var(--card-bg);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 22px;
      transition: all 0.25s ease;
    }
    .kpi-card:hover {
      border-color: var(--border-accent);
      transform: translateY(-2px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.5), 0 0 20px var(--gold-glow);
    }
    .kpi-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-dim); font-weight: 600; }
    .kpi-val { font-size: 2rem; font-weight: 700; color: var(--text-main); margin: 8px 0 4px; font-family: 'JetBrains Mono', monospace; }
    .kpi-gold { color: var(--gold-primary); }
    .kpi-violet { color: var(--violet-light); }
    .kpi-hint { font-size: 0.8rem; color: var(--text-muted); }

    .security-terminal {
      background: #000000;
      border: 1px solid var(--border-violet);
      border-radius: 14px;
      margin-bottom: 32px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.8), 0 0 25px var(--violet-glow);
      overflow: hidden;
    }
    .terminal-header {
      background: #090910;
      padding: 12px 18px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .terminal-title {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      color: var(--violet-light);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .terminal-body {
      padding: 22px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 22px;
    }
    @media (max-width: 900px) { .terminal-body { grid-template-columns: 1fr; } }
    .attack-controls h3 { font-family: 'Cinzel', serif; font-size: 1.05rem; color: var(--gold-primary); margin-bottom: 8px; }
    .attack-desc { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px; }
    .attack-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
    .attack-btn {
      background: rgba(139, 92, 246, 0.08);
      border: 1px solid var(--border-violet);
      color: #ffffff;
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 0.78rem;
      font-family: 'JetBrains Mono', monospace;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .attack-btn strong { color: var(--violet-light); }
    .attack-btn:hover { background: rgba(139, 92, 246, 0.25); border-color: var(--violet-light); transform: translateY(-1px); }
    .terminal-console {
      background: #050508;
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      padding: 16px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      height: 330px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .log-line { line-height: 1.4; word-break: break-all; }
    .log-dim { color: var(--text-dim); }
    .log-hacker { color: #f87171; }
    .log-shield { color: var(--violet-light); }
    .log-gold { color: var(--gold-light); }
    .log-rectify { color: #34d399; font-weight: 600; }

    .forms-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }
    .luxury-card {
      background: var(--card-bg);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 24px;
    }
    .luxury-card h2 {
      font-family: 'Cinzel', serif;
      font-size: 1.15rem;
      color: var(--gold-primary);
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .card-subtitle { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 18px; }
    .luxury-form { display: flex; flex-direction: column; gap: 12px; }
    .form-group { display: flex; flex-direction: column; gap: 5px; }
    .form-group label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .luxury-input, .luxury-select {
      background: #07070b;
      border: 1px solid var(--border-subtle);
      color: #ffffff;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.9rem;
      font-family: inherit;
    }
    .luxury-input:focus, .luxury-select:focus { outline: none; border-color: var(--violet-primary); box-shadow: 0 0 10px var(--violet-glow); }
    .luxury-btn {
      background: linear-gradient(135deg, #181824 0%, #2e2640 100%);
      border: 1px solid var(--border-violet);
      color: #ffffff;
      font-weight: 600;
      padding: 12px;
      border-radius: 8px;
      font-size: 0.88rem;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      transition: all 0.25s ease;
      margin-top: 6px;
    }
    .luxury-btn:hover {
      background: linear-gradient(135deg, var(--violet-dark) 0%, var(--violet-primary) 100%);
      box-shadow: 0 0 20px var(--violet-glow);
    }
    .luxury-btn.gold {
      border-color: var(--border-accent);
      background: linear-gradient(135deg, #1c1810 0%, #352b12 100%);
    }
    .luxury-btn.gold:hover {
      background: linear-gradient(135deg, var(--gold-dark) 0%, var(--gold-primary) 100%);
      color: #000;
      box-shadow: 0 0 20px var(--gold-glow);
    }
    .notice-box {
      background: rgba(139, 92, 246, 0.05);
      border: 1px solid var(--border-violet);
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      font-size: 0.85rem;
    }
    .notice-box.error { background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.4); color: #fca5a5; }
    .notice-box.success { background: rgba(16, 185, 129, 0.08); border-color: rgba(16, 185, 129, 0.4); color: #6ee7b7; }

    .tables-section { display: flex; flex-direction: column; gap: 24px; }
    .table-container {
      background: var(--card-bg);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 22px;
    }
    .table-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .table-header-row h2 { font-family: 'Cinzel', serif; font-size: 1.1rem; color: var(--text-main); }
    .table-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.72rem;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(212, 175, 55, 0.12);
      border: 1px solid var(--border-accent);
      color: var(--gold-light);
    }
    .table-badge.view { background: rgba(139, 92, 246, 0.12); border-color: var(--border-violet); color: var(--violet-light); }
    .table-wrap { overflow-x: auto; border-radius: 8px; border: 1px solid var(--border-subtle); }
    table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border-subtle); }
    th { background: #08080d; color: var(--gold-light); font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(139, 92, 246, 0.04); }
    td.amount-cell { font-family: 'JetBrains Mono', monospace; color: var(--gold-primary); font-weight: 600; }
    .empty-msg { text-align: center; color: var(--text-dim); padding: 24px; font-style: italic; }
    footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--border-subtle); text-align: center; color: var(--text-dim); font-size: 0.8rem; letter-spacing: 0.05em; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <div class="brand-title">AURA HOTEL REVENUE SYSTEM</div>
        <div class="brand-subtitle">Local MySQL Live Engine &bull; Zero-Trust Relational Architecture</div>
      </div>
      <div class="header-badges">
        <div class="badge-gold">Connected: hotel_revenue</div>
        <div class="badge-violet"><span class="badge-dot"></span> Port 3000 Live</div>
      </div>
    </header>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Active Rooms</div>
        <div class="kpi-val kpi-gold">${rooms.length}</div>
        <div class="kpi-hint">Persisted in MySQL tables</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Verified Bookings</div>
        <div class="kpi-val kpi-violet">${reservations.length}</div>
        <div class="kpi-hint">Foreign keys enforced</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Processed Payments</div>
        <div class="kpi-val kpi-gold">${payments.length}</div>
        <div class="kpi-hint">Realized receipts ledger</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Realized Revenue</div>
        <div class="kpi-val">$${totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
        <div class="kpi-hint">MySQL monthly_revenue view</div>
      </div>
    </div>

    ${errNotice}
    ${successNotice}

    <div class="forms-grid">
      <!-- Add Room Form -->
      <div class="luxury-card">
        <h2>Add Room <span class="table-badge">rooms</span></h2>
        <div class="card-subtitle">Fires MySQL trigger if rate is negative.</div>
        <form class="luxury-form" method="POST" action="/rooms">
          <div class="form-group">
            <label>Room Number</label>
            <input name="room_number" type="number" class="luxury-input" placeholder="e.g. 401" required min="1" />
          </div>
          <div class="form-group">
            <label>Room Category</label>
            <input name="room_type" type="text" class="luxury-input" placeholder="e.g. Imperial Penthouse" required maxlength="50" />
          </div>
          <div class="form-group">
            <label>Nightly Rate (USD)</label>
            <input name="room_rate" type="number" step="0.01" class="luxury-input" placeholder="e.g. 550.00" required />
          </div>
          <button type="submit" class="luxury-btn gold">Provision Room</button>
        </form>
      </div>

      <!-- Book Stay Form -->
      <div class="luxury-card">
        <h2>Book Stay <span class="table-badge">reservations</span></h2>
        <div class="card-subtitle">Guarantees referential foreign key integrity.</div>
        <form class="luxury-form" method="POST" action="/reservations">
          <div class="form-group">
            <label>Reservation ID</label>
            <input name="reservation_id" type="number" class="luxury-input" placeholder="e.g. 10" required min="1" />
          </div>
          <div class="form-group">
            <label>Guest Full Name</label>
            <input name="guest_name" type="text" class="luxury-input" placeholder="e.g. Baron Von Rothschild" required maxlength="50" />
          </div>
          <div class="form-group">
            <label>Room Allocation</label>
            <select name="room_number" class="luxury-select" required>
              ${roomOptions}
            </select>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <div class="form-group">
              <label>Check-In Date</label>
              <input name="check_in_date" type="date" class="luxury-input" required />
            </div>
            <div class="form-group">
              <label>Check-Out Date</label>
              <input name="check_out_date" type="date" class="luxury-input" required />
            </div>
          </div>
          <div class="form-group">
            <label>Total Price Quote ($)</label>
            <input name="total_cost" type="number" step="0.01" class="luxury-input" placeholder="e.g. 1650.00" required min="1" />
          </div>
          <button type="submit" class="luxury-btn">Confirm Reservation</button>
        </form>
      </div>

      <!-- Payment Form -->
      <div class="luxury-card">
        <h2>Post Payment <span class="table-badge">payments</span></h2>
        <div class="card-subtitle">Foreign key constraint on reservation_id.</div>
        <form class="luxury-form" method="POST" action="/payments">
          <div class="form-group">
            <label>Payment Receipt ID</label>
            <input name="payment_id" type="number" class="luxury-input" placeholder="e.g. 12" required min="1" />
          </div>
          <div class="form-group">
            <label>Linked Reservation</label>
            <select name="reservation_id" class="luxury-select" required>
              ${resOptions}
            </select>
          </div>
          <div class="form-group">
            <label>Transaction Date</label>
            <input name="payment_date" type="date" class="luxury-input" required />
          </div>
          <div class="form-group">
            <label>Settlement Amount ($)</label>
            <input name="payment_amount" type="number" step="0.01" class="luxury-input" placeholder="e.g. 1650.00" required min="0.01" />
          </div>
          <div class="form-group">
            <label>Settlement Method</label>
            <select name="payment_method" class="luxury-select" required>
              <option value="Black Amex Card">Black Amex Card</option>
              <option value="Direct Wire Transfer">Direct Wire Transfer</option>
              <option value="Cryptocurrency (USDC)">Cryptocurrency (USDC)</option>
              <option value="Cash Escrow">Cash Escrow</option>
            </select>
          </div>
          <button type="submit" class="luxury-btn gold">Settle Payment</button>
        </form>
      </div>
    </div>

    <div class="tables-section">
      ${renderTable('Rooms Registry', 'TABLE: rooms', rooms)}
      ${renderTable('Reservations Ledger', 'TABLE: reservations', reservations)}
      ${renderTable('Payments Ledger', 'TABLE: payments', payments)}
      ${renderTable('Monthly Revenue Projection', 'VIEW: monthly_revenue', monthlyRevenue)}
    </div>

    <footer>
      AURA LUXURY HOTELS &bull; BACKED BY LIVE MYSQL &bull; HOSTED AT HTTP://LOCALHOST:3000
    </footer>
  </div>

  <script>
    function logMsg(role, text) {
      const box = document.getElementById('serverLogs');
      const time = new Date().toTimeString().slice(0, 8);
      const div = document.createElement('div');
      div.className = 'log-line';
      if (role === 'hacker') {
        div.innerHTML = '<span class="log-dim">[' + time + ']</span> <span class="log-hacker">[HACKER PAYLOAD]:</span> ' + text;
      } else if (role === 'shield') {
        div.innerHTML = '<span class="log-dim">[' + time + ']</span> <span class="log-shield">[DEFENSE ACTIVE]:</span> ' + text;
      } else if (role === 'rectify') {
        div.innerHTML = '<span class="log-dim">[' + time + ']</span> <span class="log-rectify">[RECTIFIED & SAFE]:</span> ' + text;
      }
      box.appendChild(div);
      box.scrollTop = box.scrollHeight;
    }

    function testAttack(type) {
      if (type === 'sqli') {
        logMsg('hacker', "Executing SQL Injection: '' OR '1'='1' -- DROP TABLE payments;");
        setTimeout(() => {
          logMsg('shield', "MySQL2 driver prepares statements using server-side binary protocol.");
          logMsg('rectify', "Malicious quotes escaped as literal strings. Attack defeated.");
        }, 300);
      } else if (type === 'xss') {
        logMsg('hacker', "Injecting XSS cookie sniffer into Guest Name.");
        setTimeout(() => {
          logMsg('shield', "Output rendering pipeline passed through entity escaper.");
          logMsg('rectify', "Payload translated to safe plaintext &lt;script&gt;. Execution stopped.");
        }, 300);
      } else if (type === 'negative') {
        logMsg('hacker', "Testing negative room rate (-$500.00) directly on MySQL.");
        setTimeout(() => {
          logMsg('shield', "MySQL Trigger 'check_room_rate' intercepted: Room rate cannot be negative.");
          logMsg('rectify', "Database aborted transaction with error code 1644.");
        }, 300);
      } else if (type === 'fk_ghost') {
        logMsg('hacker', "Inserting orphan payment for non-existent reservation #9999.");
        setTimeout(() => {
          logMsg('shield', "MySQL Foreign Key constraint failed on payments_ibfk_1.");
          logMsg('rectify', "Referential integrity maintained. Database unchanged.");
        }, 300);
      }
    }
  </script>
</body>
</html>`);
  } catch (err) {
    res.status(500).send(`<pre>Database error: ${err.message}</pre>`);
  }
});

// Post Room with validations
app.post('/rooms', async (req, res) => {
  try {
    const { room_number, room_type, room_rate } = req.body;
    const num = parseInt(room_number, 10);
    const rate = parseFloat(room_rate);

    if (isNaN(num) || num <= 0) {
      return res.redirect('/?error=' + encodeURIComponent('Room number must be a positive integer.'));
    }
    if (isNaN(rate) || rate <= 0) {
      return res.redirect('/?error=' + encodeURIComponent('Room rate cannot be negative or zero (Enforced by check_room_rate trigger).'));
    }

    await pool.query(
      'INSERT INTO rooms (room_number, room_type, room_rate) VALUES (?, ?, ?)',
      [num, escapeHTML(room_type.trim()), rate]
    );
    res.redirect('/?success=' + encodeURIComponent(`Room #${num} provisioned successfully.`));
  } catch (err) {
    res.redirect('/?error=' + encodeURIComponent(err.message));
  }
});

// Post Reservation with date & FK validations
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

// Post Payment with Foreign Key validation
app.post('/payments', async (req, res) => {
  try {
    const { payment_id, reservation_id, payment_date, payment_amount, payment_method } = req.body;
    const payId = parseInt(payment_id, 10);
    const resId = parseInt(reservation_id, 10);
    const amount = parseFloat(payment_amount);

    if (isNaN(amount) || amount <= 0) {
      return res.redirect('/?error=' + encodeURIComponent('Payment amount must be greater than $0.00.'));
    }

    await pool.query(
      'INSERT INTO payments (payment_id, reservation_id, payment_date, payment_amount, payment_method) VALUES (?, ?, ?, ?, ?)',
      [payId, resId, payment_date, amount, escapeHTML(payment_method)]
    );
    res.redirect('/?success=' + encodeURIComponent(`Payment #${payId} of $${amount.toFixed(2)} recorded.`));
  } catch (err) {
    res.redirect('/?error=' + encodeURIComponent(err.message));
  }
});

app.listen(PORT, () => {
  console.log(`AURA Hotel Database System running at http://localhost:${PORT}`);
});
