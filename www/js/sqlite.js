document.addEventListener("deviceready", function() {
    window.db = window.sqlitePlugin.openDatabase({ name: "kandzapp.db", location: "default" });

    db.transaction(function(tx) {
        tx.executeSql("CREATE TABLE IF NOT EXISTS results (id integer primary key, dom text, gost text, total text, h2 text, h1 text)");
        tx.executeSql("CREATE TABLE IF NOT EXISTS stats (team text primary key, played int, scored int, conceded int, gg int, twoPlus int, ng int)");
        tx.executeSql("CREATE TABLE IF NOT EXISTS future (id integer primary key, dom text, gost text)");
        tx.executeSql("CREATE TABLE IF NOT EXISTS predictions (id integer primary key, dom text, gost text, gg int, ng int, twoPlus int)");
    }, function(error) {
        console.log("DB ERROR: " + error.message);
    }, function() {
        console.log("DB READY");
        loadAllTables();
    });
});

function loadAllTables() {
    loadTable("results", "resultsTable", ["dom","gost","total","h2","h1"]);
    loadTable("future", "futureTable", ["dom","gost"]);
    loadPredictionTable();
}

function loadTable(table, htmlTableId, fields) {
    db.transaction(function(tx) {
        tx.executeSql("SELECT * FROM " + table, [], function(tx, res) {
            const tbody = document.querySelector("#" + htmlTableId + " tbody");
            tbody.innerHTML = "";

            for (let i = 0; i < res.rows.length; i++) {
                const row = res.rows.item(i);
                const tr = document.createElement("tr");

                fields.forEach(f => {
                    const td = document.createElement("td");
                    const input = document.createElement("input");
                    input.value = row[f] || "";
                    input.dataset.id = row.id;
                    input.dataset.field = f;
                    input.onchange = saveField;
                    td.appendChild(input);
                    tr.appendChild(td);
                });

                const delTd = document.createElement("td");
                const del = document.createElement("span");
                del.innerText = "X";
                del.className = "row-btn";
                del.onclick = () => deleteRow(table, row.id, htmlTableId);
                delTd.appendChild(del);
                tr.appendChild(delTd);

                tbody.appendChild(tr);
            }
        });
    });
}

function saveField(e) {
    const id = e.target.dataset.id;
    const field = e.target.dataset.field;
    const value = e.target.value;

    if (!id) return;

    db.transaction(function(tx) {
        tx.executeSql(`UPDATE results SET ${field}=? WHERE id=?`, [value, id]);
        tx.executeSql(`UPDATE future SET ${field}=? WHERE id=?`, [value, id]);
    });
}

function deleteRow(table, id, htmlTableId) {
    db.transaction(function(tx) {
        tx.executeSql("DELETE FROM " + table + " WHERE id=?", [id]);
    }, null, function() {
        loadTable(table, htmlTableId);
    });
}

function addRowDB(table, fields, values, htmlTableId) {
    const q = `INSERT INTO ${table} (${fields.join(",")}) VALUES (${fields.map(()=>"?").join(",")})`;

    db.transaction(function(tx) {
        tx.executeSql(q, values);
    }, null, function() {
        loadTable(table, htmlTableId);
    });
}

// Pozivi iz HTML-a
function addResultRow() {
    addRowDB("results", ["dom","gost","total","h2","h1"], ["","","","",""], "resultsTable");
}

function addFutureRow() {
    addRowDB("future", ["dom","gost"], ["",""], "futureTable");
}

function loadPredictionTable() {
    db.transaction(function(tx) {
        tx.executeSql("SELECT * FROM predictions", [], function(tx, res) {
            const tbody = document.querySelector("#predictionTable tbody");
            tbody.innerHTML = "";
            for (let i = 0; i < res.rows.length; i++) {
                const r = res.rows.item(i);
                const tr = document.createElement("tr");
                tr.innerHTML = `<td>${r.dom}</td><td>${r.gost}</td><td>${r.gg}</td><td>${r.ng}</td><td>${r.twoPlus}</td>`;
                tbody.appendChild(tr);
            }
        });
    });
}
