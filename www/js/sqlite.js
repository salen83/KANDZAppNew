/*
  sqlite.js - stable SQLite integration + UI handlers
  - ensures each table row has data-id (db id)
  - addResultRow / addFutureRow insert first then render row with id
  - updateStats reads DOM rows (which are bound to DB ids)
*/

let db;

document.addEventListener('deviceready', () => {
  // open DB
  db = window.sqlitePlugin.openDatabase({ name: 'kandz.db', location: 'default' });

  // create tables
  db.transaction(tx => {
    tx.executeSql(`CREATE TABLE IF NOT EXISTS rezultati (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domacin TEXT,
      gost TEXT,
      total TEXT,
      twoH TEXT,
      oneH TEXT
    )`);
    tx.executeSql(`CREATE TABLE IF NOT EXISTS future (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domacin TEXT,
      gost TEXT
    )`);
  }, err => console.error('DB init error:', err), () => {
    loadAllData();
  });
});

// ---------- Load ----------
function loadAllData() {
  loadResults();
  loadFuture();
}

function loadResults() {
  db.transaction(tx => {
    tx.executeSql('SELECT * FROM rezultati ORDER BY id ASC', [], (tx, res) => {
      const tbody = document.querySelector('#resultsTable tbody');
      tbody.innerHTML = '';
      for (let i = 0; i < res.rows.length; i++) {
        const r = res.rows.item(i);
        renderRowFromDb('resultsTable', r.id, [r.domacin, r.gost, r.total, r.twoH, r.oneH]);
      }
    });
  }, err => console.error('loadResults error', err));
}

function loadFuture() {
  db.transaction(tx => {
    tx.executeSql('SELECT * FROM future ORDER BY id ASC', [], (tx, res) => {
      const tbody = document.querySelector('#futureTable tbody');
      tbody.innerHTML = '';
      for (let i = 0; i < res.rows.length; i++) {
        const r = res.rows.item(i);
        renderRowFromDb('futureTable', r.id, [r.domacin, r.gost]);
      }
    });
  }, err => console.error('loadFuture error', err));
}

// ---------- Render / bind a row that is backed by DB id ----------
function renderRowFromDb(tableId, id, values) {
  const tbody = document.getElementById(tableId).querySelector('tbody');
  const row = document.createElement('tr');
  row.dataset.id = id;

  values.forEach((val, idx) => {
    const td = document.createElement('td');
    const input = document.createElement('input');
    input.value = val || '';
    // For accessibility: set placeholder for result columns
    if (tableId === 'resultsTable' && idx === 2 && !input.value) input.placeholder = '0:0';
    td.appendChild(input);
    row.appendChild(td);

    // change -> update DB for this row id
    input.addEventListener('change', () => {
      if (tableId === 'resultsTable') {
        const tds = row.querySelectorAll('input');
        const dom = tds[0].value.trim();
        const gost = tds[1].value.trim();
        const total = tds[2].value.trim();
        const twoH = tds[3].value.trim();
        const oneH = tds[4].value.trim();
        updateResultById(row.dataset.id, dom, gost, total, twoH, oneH);
      } else if (tableId === 'futureTable') {
        const tds = row.querySelectorAll('input');
        const dom = tds[0].value.trim();
        const gost = tds[1].value.trim();
        updateFutureById(row.dataset.id, dom, gost);
      }
    });
  });

  // delete button
  const delTd = document.createElement('td');
  const delBtn = document.createElement('span');
  delBtn.innerText = 'X';
  delBtn.className = 'row-btn';
  delBtn.onclick = () => {
    if (tableId === 'resultsTable') deleteResultById(row.dataset.id, row);
    else if (tableId === 'futureTable') deleteFutureById(row.dataset.id, row);
  };
  delTd.appendChild(delBtn);
  row.appendChild(delTd);

  tbody.appendChild(row);
}

// ---------- Add new rows (insert then render with returned id) ----------
function addResultRow() {
  db.transaction(tx => {
    tx.executeSql('INSERT INTO rezultati (domacin, gost, total, twoH, oneH) VALUES (?,?,?,?,?)',
      ['', '', '', '', ''], (tx, res) => {
        // res.insertId is new id
        renderRowFromDb('resultsTable', res.insertId, ['', '', '', '', '']);
      });
  }, err => console.error('addResultRow error', err));
}

function addFutureRow() {
  db.transaction(tx => {
    tx.executeSql('INSERT INTO future (domacin, gost) VALUES (?,?)', ['', ''], (tx, res) => {
      renderRowFromDb('futureTable', res.insertId, ['', '']);
    });
  }, err => console.error('addFutureRow error', err));
}

// ---------- Update DB by id ----------
function updateResultById(id, dom, gost, total, twoH, oneH) {
  if (!id) return;
  db.transaction(tx => {
    tx.executeSql('UPDATE rezultati SET domacin=?, gost=?, total=?, twoH=?, oneH=? WHERE id=?',
      [dom, gost, total, twoH, oneH, id]);
  }, err => console.error('updateResultById error', err));
}

function updateFutureById(id, dom, gost) {
  if (!id) return;
  db.transaction(tx => {
    tx.executeSql('UPDATE future SET domacin=?, gost=? WHERE id=?', [dom, gost, id]);
  }, err => console.error('updateFutureById error', err));
}

// ---------- Delete by id ----------
function deleteResultById(id, rowEl) {
  if (!id) { if(rowEl) rowEl.remove(); return; }
  db.transaction(tx => {
    tx.executeSql('DELETE FROM rezultati WHERE id=?', [id], () => {
      if (rowEl) rowEl.remove();
    });
  }, err => console.error('deleteResultById error', err));
}

function deleteFutureById(id, rowEl) {
  if (!id) { if(rowEl) rowEl.remove(); return; }
  db.transaction(tx => {
    tx.executeSql('DELETE FROM future WHERE id=?', [id], () => {
      if (rowEl) rowEl.remove();
    });
  }, err => console.error('deleteFutureById error', err));
}

// ---------- Clear tables from DB (use with care) ----------
function clearResultsTable() {
  if (!confirm('Obrisati sve rezultate iz baze?')) return;
  db.transaction(tx => {
    tx.executeSql('DELETE FROM rezultati', [], () => {
      document.querySelector('#resultsTable tbody').innerHTML = '';
    });
  }, err => console.error('clearResultsTable error', err));
}

function clearFutureTable() {
  if (!confirm('Obrisati sve buduće mečeve iz baze?')) return;
  db.transaction(tx => {
    tx.executeSql('DELETE FROM future', [], () => {
      document.querySelector('#futureTable tbody').innerHTML = '';
    });
  }, err => console.error('clearFutureTable error', err));
}

// ---------- Stats calculation ----------
// expects total in formats '1:1' or '1-1' or '1: 1' etc.
// counts per team:
// played, goals for, goals against, GG, twoPlus, NG
function updateStats() {
  const rows = Array.from(document.querySelectorAll('#resultsTable tbody tr'));
  const map = {}; // team -> stats

  function ensure(team) {
    if (!team) return null;
    if (!map[team]) map[team] = { played:0, scored:0, conceded:0, GG:0, twoPlus:0, NG:0 };
    return map[team];
  }

  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    if (inputs.length < 3) return;
    const home = inputs[0].value.trim();
    const away = inputs[1].value.trim();
    const total = inputs[2].value.trim();

    // parse goals
    let g1 = 0, g2 = 0;
    if (total) {
      const sep = total.includes(':') ? ':' : (total.includes('-') ? '-' : null);
      if (sep) {
        const parts = total.split(sep).map(s => parseInt(s.trim()) || 0);
        g1 = parts[0]||0;
        g2 = parts[1]||0;
      } else {
        // fallback try split by space
        const parts = total.split(/\s+/).map(s => parseInt(s)||0);
        g1 = parts[0]||0;
        g2 = parts[1]||0;
      }
    }

    // update home
    if (home) {
      const s = ensure(home);
      if (s) {
        s.played += 1;
        s.scored += g1;
        s.conceded += g2;
        if (g1>0 && g2>0) s.GG += 1;
        if (g1+g2 >= 2) s.twoPlus +=1;
        if (g1===0 || g2===0) s.NG +=1;
      }
    }

    // update away
    if (away) {
      const s = ensure(away);
      if (s) {
        s.played += 1;
        s.scored += g2;
        s.conceded += g1;
        if (g1>0 && g2>0) s.GG += 1;
        if (g1+g2 >= 2) s.twoPlus +=1;
        if (g1===0 || g2===0) s.NG +=1;
      }
    }
  });

  // render stats
  const tbody = document.querySelector('#statsTable tbody');
  tbody.innerHTML = '';
  Object.keys(map).forEach(team => {
    const s = map[team];
    const ggPct = s.played ? Math.round(100 * s.GG / s.played) : 0;
    const twoPct = s.played ? Math.round(100 * s.twoPlus / s.played) : 0;
    const ngPct = s.played ? Math.round(100 * s.NG / s.played) : 0;

    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${team}</td><td>${s.played}</td><td>${s.scored}</td><td>${s.conceded}</td>
      <td>${s.GG}</td><td>${s.twoPlus}</td><td>${ggPct}%</td><td>${twoPct}%</td><td>${s.NG}</td><td>${ngPct}%</td>`;
    tbody.appendChild(tr);
  });
}

// small helpers
function clearStatsTable() {
  if (!confirm('Obrisati statistiku iz prikaza? (ne briše DB)')) return;
  document.querySelector('#statsTable tbody').innerHTML = '';
}
