let db;
document.addEventListener('deviceready',()=>{
  db=window.sqlitePlugin.openDatabase({name:'kandz.db',location:'default'});
  db.transaction(tx=>{
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
  },err=>console.error(err),loadAllData);
});

function loadAllData(){loadResults();loadFuture();}
function loadResults(){
  db.transaction(tx=>{
    tx.executeSql('SELECT * FROM rezultati',[],(tx,res)=>{
      const tbody=document.querySelector('#resultsTable tbody');
      tbody.innerHTML='';
      for(let i=0;i<res.rows.length;i++){
        const r=res.rows.item(i);
        addRowFromData('resultsTable',[r.domacin,r.gost,r.total,r.twoH,r.oneH]);
      }
    });
  });
}
function loadFuture(){
  db.transaction(tx=>{
    tx.executeSql('SELECT * FROM future',[],(tx,res)=>{
      const tbody=document.querySelector('#futureTable tbody');
      tbody.innerHTML='';
      for(let i=0;i<res.rows.length;i++){
        const r=res.rows.item(i);
        addRowFromData('futureTable',[r.domacin,r.gost]);
      }
    });
  });
}
function addRowFromData(tableId,values){
  const tbody=document.getElementById(tableId).querySelector('tbody');
  const row=document.createElement('tr');
  values.forEach(v=>{
    const td=document.createElement('td');
    const input=document.createElement('input');
    input.value=v;
    td.appendChild(input);
    row.appendChild(td);
  });
  const delTd=document.createElement('td');
  const delBtn=document.createElement('span');
  delBtn.innerText='X';
  delBtn.className='row-btn';
  delBtn.onclick=()=>{
    if(tableId==='resultsTable') deleteResultRow(row);
    if(tableId==='futureTable') deleteFutureRow(row);
    row.remove();
  };
  delTd.appendChild(delBtn);
  row.appendChild(delTd);
  tbody.appendChild(row);

  const inputs=row.querySelectorAll('input');
  if(tableId==='resultsTable'){
    saveResultRow(inputs[0].value,inputs[1].value,inputs[2].value,inputs[3].value,inputs[4].value);
    inputs.forEach(input=>input.addEventListener('change',()=>saveResultRow(inputs[0].value,inputs[1].value,inputs[2].value,inputs[3].value,inputs[4].value)));
  }
  if(tableId==='futureTable'){
    inputs.forEach(input=>input.addEventListener('change',()=>saveFutureRow(inputs[0].value,inputs[1].value)));
  }
}
function saveResultRow(domacin,gost,total,twoH,oneH){
  db.transaction(tx=>{
    tx.executeSql('SELECT id FROM rezultati WHERE domacin=? AND gost=? AND total=?',[domacin,gost,total],(tx,res)=>{
      if(res.rows.length>0){
        const id=res.rows.item(0).id;
        tx.executeSql('UPDATE rezultati SET domacin=?,gost=?,total=?,twoH=?,oneH=? WHERE id=?',[domacin,gost,total,twoH,oneH,id]);
      }else{
        tx.executeSql('INSERT INTO rezultati(domacin,gost,total,twoH,oneH) VALUES(?,?,?,?,?)',[domacin,gost,total,twoH,oneH]);
      }
    });
  });
}
function saveFutureRow(domacin,gost){
  db.transaction(tx=>{
    tx.executeSql('SELECT id FROM future WHERE domacin=? AND gost=?',[domacin,gost],(tx,res)=>{
      if(res.rows.length===0){
        tx.executeSql('INSERT INTO future(domacin,gost) VALUES(?,?)',[domacin,gost]);
      }
    });
  });
}
function deleteResultRow(row){
  const tds=row.querySelectorAll('td input');
  db.transaction(tx=>{
    tx.executeSql('DELETE FROM rezultati WHERE domacin=? AND gost=? AND total=? LIMIT 1',[tds[0].value,tds[1].value,tds[2].value]);
  });
}
function deleteFutureRow(row){
  const tds=row.querySelectorAll('td input');
  db.transaction(tx=>{
    tx.executeSql('DELETE FROM future WHERE domacin=? AND gost=? LIMIT 1',[tds[0].value,tds[1].value]);
  });
}
