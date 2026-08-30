const mysql = require('mysql2/promise');
async function run() {
  const c = await mysql.createConnection({host:'localhost', user:'root', password:'', database:'user1'});
  const [r] = await c.query("SHOW COLUMNS FROM variants LIKE 'status'");
  console.log(r);
  c.end();
}
run();
