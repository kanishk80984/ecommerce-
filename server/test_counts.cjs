const mysql = require('mysql2/promise');
async function run() {
  const c = await mysql.createConnection({host:'localhost', user:'root', password:'', database:'user1'});
  const [r1] = await c.query("SELECT COUNT(*) as cnt FROM products p LEFT JOIN models m ON p.id = m.product_id WHERE m.id IS NULL");
  console.log('Products with no models:', r1[0].cnt);
  const [r2] = await c.query("SELECT COUNT(*) as cnt FROM models m LEFT JOIN variants v ON m.id = v.model_id WHERE v.id IS NULL");
  console.log('Models with no variants:', r2[0].cnt);
  process.exit();
}
run();
