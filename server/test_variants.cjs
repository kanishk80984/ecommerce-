const mysql = require('mysql2/promise');
async function run() {
  const c = await mysql.createConnection({host:'localhost', user:'root', password:''});
  const [r] = await c.query('SELECT c.name, p.status as pstat, v.status as vstat FROM user1.variants v JOIN user1.models m ON v.model_id = m.id JOIN user1.products p ON m.product_id = p.id JOIN user1.categories c ON p.category_id = c.id LIMIT 10');
  console.log(r);
  process.exit();
}
run();
