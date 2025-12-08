/*
  sqlite.js - DB + UI + Model C predictions (Poisson + empirical hybrid)
  alpha = 0.6 => final = 0.6*Poisson + 0.4*Empirical
*/

const PRED_ALPHA = 0.6; // weight for Poisson in hybrid model

let db;

document.addEventListener('deviceready', () => {
  db = window.sqlitePlugin.openDatabase({ name: 'kandz.db', location: 'default' });

  db.transaction(tx => {
    tx.executeSql(`CREATE TABLE IF NOT EXISTS rezultati (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domacin TEXT, gost TEXT, total TEXT, twoH TEXT, oneH TEXT
    )`);
    tx.executeSql(`CREATE TABLE IF NOT EXISTS future (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domacin TEXT, gost TEXT
    )`);
    // Optional statistika table, we may use it if you have it
    tx.executeSql(`CREATE TABLE IF NOT EXISTS statistika (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tim TEXT UNIQUE, odigrano INTEGER, golovi_dati INTEGER, golovi_primljeni INTEGER,
      GG INTEGER, twoPlus INTEGER, pctGG INTEGER, pct2Plus INTEGER, NG INTEGER, pctNG INTEGER
    )`);
  }, err => console.error('DB init error', err), () => {
    loadAllData();
  });
});

// ---------- Load ----------
function loadAllData() { loadResults(); loadFuture(); }

function loadResults() {
  db.transaction(tx => {
    tx.executeSql('SELECT * FROM rezultati ORDER BY id ASC', [], (tx, res) => {
      const tbody = document.querySelector('#resultsTable tbody');
      tbody.innerHTML = '';
      for (let i=0;i<res.rows.length;i++){
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
      for (let i=0;i<res.rows.length;i++){
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
  row.dataset.id = id || '';

  values.forEach((val, idx) => {
    const td = document.createElement('td');
    const input = document.createElement('input');
    input.value = val || '';
    if (tableId === 'resultsTable' && idx === 2 && !input.value) input.placeholder = '0:0';
    td.appendChild(input);
    row.appendChild(td);

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

  // delete
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
    tx.executeSql('INSERT INTO rezultati (domacin,gost,total,twoH,oneH) VALUES (?,?,?,?,?)',
      ['', '', '', '', ''], (tx, res) => {
        renderRowFromDb('resultsTable', res.insertId, ['', '', '', '', '']);
      });
  }, err => console.error('addResultRow error', err));
}

function addFutureRow() {
  db.transaction(tx => {
    tx.executeSql('INSERT INTO future (domacin,gost) VALUES (?,?)', ['', ''], (tx, res) => {
      renderRowFromDb('futureTable', res.insertId, ['', '']);
    });
  }, err => console.error('addFutureRow error', err));
}

// ---------- Update DB by id ----------
function updateResultById(id, dom, gost, total, twoH, oneH) {
  if (!id) {
    // if no id, create new then assign id to last DOM row
    db.transaction(tx => {
      tx.executeSql('INSERT INTO rezultati (domacin,gost,total,twoH,oneH) VALUES (?,?,?,?,?)', [dom,gost,total,twoH,oneH], (tx,res) => {
        const row = document.querySelector('#resultsTable tbody tr:last-child');
        if (row) row.dataset.id = res.insertId;
      });
    });
    return;
  }
  db.transaction(tx => {
    tx.executeSql('UPDATE rezultati SET domacin=?, gost=?, total=?, twoH=?, oneH=? WHERE id=?',
      [dom, gost, total, twoH, oneH, id]);
  }, err => console.error('updateResultById error', err));
}

function updateFutureById(id, dom, gost) {
  if (!id) {
    db.transaction(tx => {
      tx.executeSql('INSERT INTO future (domacin,gost) VALUES (?,?)', [dom,gost], (tx,res) => {
        const row = document.querySelector('#futureTable tbody tr:last-child');
        if (row) row.dataset.id = res.insertId;
      });
    });
    return;
  }
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

// ---------- Clear tables ----------
function clearResultsTable() {
  if (!confirm('Obrisati sve rezultate iz baze?')) return;
  db.transaction(tx => {
    tx.executeSql('DELETE FROM rezultati', [], () => {
      document.querySelector('#resultsTable tbody').innerHTML = '';
    });
  }, err => console.error('clearResultsTable error', err));
}
function clearFutureTable() {
  if (!confirm('Obrisati sve future meceve iz baze?')) return;
  db.transaction(tx => {
    tx.executeSql('DELETE FROM future', [], () => {
      document.querySelector('#futureTable tbody').innerHTML = '';
    });
  }, err => console.error('clearFutureTable error', err));
}

// ---------- Stats calculation ----------
function updateStats() {
  const rows = Array.from(document.querySelectorAll('#resultsTable tbody tr'));
  const map = {};
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
    let g1=0, g2=0;
    if (total) {
      const sep = total.includes(':') ? ':' : (total.includes('-') ? '-' : null);
      if (sep) {
        const parts = total.split(sep).map(s => parseInt(s.trim())||0);
        g1=parts[0]||0; g2=parts[1]||0;
      } else {
        const parts = total.split(/\s+/).map(s => parseInt(s)||0);
        g1=parts[0]||0; g2=parts[1]||0;
      }
    }
    if (home) {
      const s = ensure(home);
      if (s) {
        s.played++; s.scored+=g1; s.conceded+=g2;
        if (g1>0 && g2>0) s.GG++;
        if (g1+g2>=2) s.twoPlus++;
        if (g1===0 || g2===0) s.NG++;
      }
    }
    if (away) {
      const s = ensure(away);
      if (s) {
        s.played++; s.scored+=g2; s.conceded+=g1;
        if (g1>0 && g2>0) s.GG++;
        if (g1+g2>=2) s.twoPlus++;
        if (g1===0 || g2===0) s.NG++;
      }
    }
  });

  // render
  const tbody = document.querySelector('#statsTable tbody');
  tbody.innerHTML = '';
  Object.keys(map).forEach(team => {
    const s = map[team];
    const ggPct = s.played ? Math.round(100*s.GG/s.played) : 0;
    const twoPct = s.played ? Math.round(100*s.twoPlus/s.played) : 0;
    const ngPct = s.played ? Math.round(100*s.NG/s.played) : 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${team}</td><td>${s.played}</td><td>${s.scored}</td><td>${s.conceded}</td>
      <td>${s.GG}</td><td>${s.twoPlus}</td><td>${ggPct}%</td><td>${twoPct}%</td><td>${s.NG}</td><td>${ngPct}%</td>`;
    tbody.appendChild(tr);
  });
}

// ---------- PREDICTIONS: Poisson + empirical hybrid (Model C) ----------

// Poisson pmf up to maxK
function poissonPmf(lambda, maxK=6) {
  const res = [];
  let fact = 1;
  let lambdaPow = 1;
  for (let k=0;k<=maxK;k++){
    if (k===0) { fact = 1; lambdaPow = 1; }
    else { fact *= k; lambdaPow *= lambda; }
    res.push(Math.exp(-lambda) * lambdaPow / fact);
  }
  return res;
}

// get team stats (attempt to read statistika table, otherwise compute from rezultati)
function getTeamStats(teamName, callback) {
  if (!teamName) {
    callback({team:'', played:0, scored:0, conceded:0, pctGG:0, pct2Plus:0, pctNG:0});
    return;
  }
  db.transaction(tx=>{
    tx.executeSql('SELECT * FROM statistika WHERE tim=? LIMIT 1', [teamName], (tx, res) => {
      if (res.rows.length>0) {
        const r = res.rows.item(0);
        callback({team:teamName, played:r.odigrano||0, scored:r.golovi_dati||0, conceded:r.golovi_primljeni||0,
          pctGG:r.pctGG||0, pct2Plus:r.pct2Plus||0, pctNG:r.pctNG||0});
      } else {
        // compute from rezultati
        tx.executeSql('SELECT * FROM rezultati WHERE domacin=? OR gost=?', [teamName, teamName], (tx2, res2)=>{
          let played=0, scored=0, conceded=0, GG=0, twoPlus=0, NG=0;
          for (let i=0;i<res2.rows.length;i++){
            const row = res2.rows.item(i);
            const total = (row.total||'').toString().trim();
            let g1=0,g2=0;
            if (total){
              const sep = total.includes(':') ? ':' : (total.includes('-') ? '-' : null);
              if (sep) {
                const parts = total.split(sep).map(s=>parseInt(s.trim())||0);
                g1=parts[0]||0; g2=parts[1]||0;
              } else {
                const parts = total.split(/\s+/).map(s=>parseInt(s)||0);
                g1=parts[0]||0; g2=parts[1]||0;
              }
            }
            if (row.domacin === teamName) {
              played++; scored+=g1; conceded+=g2;
              if (g1>0 && g2>0) GG++;
              if (g1+g2>=2) twoPlus++;
              if (g1===0 || g2===0) NG++;
            } else if (row.gost === teamName) {
              played++; scored+=g2; conceded+=g1;
              if (g1>0 && g2>0) GG++;
              if (g1+g2>=2) twoPlus++;
              if (g1===0 || g2===0) NG++;
            }
          }
          const pctGG = played ? Math.round(100*GG/played) : 0;
          const pct2Plus = played ? Math.round(100*twoPlus/played) : 0;
          const pctNG = played ? Math.round(100*NG/played) : 0;
          callback({team:teamName, played, scored, conceded, pctGG, pct2Plus, pctNG});
        });
      }
    });
  }, err=>{ console.error('getTeamStats tx error', err); callback(null); });
}

// compute match prediction (hybrid)
function computeMatchPrediction(homeStats, awayStats, alpha=PRED_ALPHA) {
  const home_played = Math.max(1, homeStats.played||0);
  const away_played = Math.max(1, awayStats.played||0);
  const home_scored_pg = (homeStats.scored||0)/home_played;
  const home_conceded_pg = (homeStats.conceded||0)/home_played;
  const away_scored_pg = (awayStats.scored||0)/away_played;
  const away_conceded_pg = (awayStats.conceded||0)/away_played;

  const lambda_home = (home_scored_pg + away_conceded_pg)/2;
  const lambda_away = (away_scored_pg + home_conceded_pg)/2;

  const maxK = 6;
  const ph = poissonPmf(lambda_home, maxK);
  const pa = poissonPmf(lambda_away, maxK);

  const P_home0 = ph[0]||0, P_away0 = pa[0]||0;
  const P_00 = P_home0 * P_away0;
  const poissonGG = Math.max(0, 1 - P_home0 - P_away0 + P_00);
  const P_10 = (ph[1]||0) * (pa[0]||0);
  const P_01 = (ph[0]||0) * (pa[1]||0);
  const poisson2Plus = Math.max(0, 1 - (P_00 + P_10 + P_01));

  const empGG = ((homeStats.pctGG||0) + (awayStats.pctGG||0))/2 / 100.0;
  const emp2Plus = ((homeStats.pct2Plus||0) + (awayStats.pct2Plus||0))/2 / 100.0;
  const empNG = ((homeStats.pctNG||0) + (awayStats.pctNG||0))/2 / 100.0;

  const finalGG = alpha * poissonGG + (1 - alpha) * empGG;
  const final2Plus = alpha * poisson2Plus + (1 - alpha) * emp2Plus;
  const finalNG = Math.max(0, 1 - finalGG);

  return {
    poisson: { gg: poissonGG, twoPlus: poisson2Plus, ng: 1 - poissonGG },
    empirical: { gg: empGG, twoPlus: emp2Plus, ng: empNG },
    final: { gg: finalGG, twoPlus: final2Plus, ng: finalNG },
    lambda: { home: lambda_home, away: lambda_away }
  };
}

// compute and render predictions for future matches
function computeAllPredictionsAndRender() {
  db.transaction(tx=>{
    tx.executeSql('SELECT * FROM future ORDER BY id ASC', [], (tx,res)=>{
      const matches = [];
      for (let i=0;i<res.rows.length;i++) matches.push(res.rows.item(i));
      const tbody = document.querySelector('#predictionTable tbody');
      if (!tbody) return;
      tbody.innerHTML = '';
      const processNext = (idx) => {
        if (idx >= matches.length) return;
        const m = matches[idx];
        const home = m.domacin||'';
        const away = m.gost||'';
        getTeamStats(home, (hs)=>{
          if (!hs) hs={played:0,scored:0,conceded:0,pctGG:0,pct2Plus:0,pctNG:0};
          getTeamStats(away, (as)=>{
            if (!as) as={played:0,scored:0,conceded:0,pctGG:0,pct2Plus:0,pctNG:0};
            const pred = computeMatchPrediction(hs, as, PRED_ALPHA);
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${home}</td><td>${away}</td><td>${Math.round(pred.final.gg*100)}%</td><td>${Math.round(pred.final.ng*100)}%</td><td>${Math.round(pred.final.twoPlus*100)}%</td>`;
            tbody.appendChild(tr);
            processNext(idx+1);
          });
        });
      };
      processNext(0);
    });
  }, err=>console.error('computeAllPredictionsAndRender error', err));
}

// generate top50
function generateTop50(metric='gg') {
  db.transaction(tx=>{
    tx.executeSql('SELECT * FROM future ORDER BY id ASC', [], (tx,res)=>{
      const matches = [];
      for (let i=0;i<res.rows.length;i++) matches.push(res.rows.item(i));
      const results = [];
      const processNext = (idx) => {
        if (idx >= matches.length) {
          results.sort((a,b)=>b.score - a.score);
          const tbody = document.querySelector('#top50Table tbody');
          if (!tbody) return;
          tbody.innerHTML = '';
          const top = results.slice(0,50);
          top.forEach(r=>{
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${r.match.domacin}</td><td>${r.match.gost}</td><td>${Math.round(r.pred.final.gg*100)}%</td><td>${Math.round(r.pred.final.ng*100)}%</td><td>${Math.round(r.pred.final.twoPlus*100)}%</td>`;
            tbody.appendChild(tr);
          });
          return;
        }
        const m = matches[idx];
        const home = m.domacin||'';
        const away = m.gost||'';
        getTeamStats(home, (hs)=>{ if(!hs) hs={played:0,scored:0,conceded:0,pctGG:0,pct2Plus:0,pctNG:0};
          getTeamStats(away, (as)=>{ if(!as) as={played:0,scored:0,conceded:0,pctGG:0,pct2Plus:0,pctNG:0};
            const pred = computeMatchPrediction(hs, as, PRED_ALPHA);
            const score = pred.final[metric] || 0;
            results.push({match:m, pred, score});
            processNext(idx+1);
          });
        });
      };
      processNext(0);
    });
  }, err=>console.error('generateTop50 error', err));
}

// UI hooks
function updatePredictionsUI() { computeAllPredictionsAndRender(); }
function updateTop50UI(metric) { generateTop50(metric || 'gg'); }

function clearStatsTable() { if (!confirm('Obrisati statistiku iz prikaza?')) return; document.querySelector('#statsTable tbody').innerHTML=''; }
