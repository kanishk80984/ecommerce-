import pool from './config/db.js';

async function test() {
  const [db] = await pool.query('SELECT DATABASE() as db');
  console.log('Database connected:', db[0].db);

  const [items] = await pool.query(`SELECT id, order_id, product_id, vendor_id, item_status FROM order_items WHERE item_status = 'WAITING_FOR_PICKUP'`);
  console.log('WAITING_FOR_PICKUP order_items:', items);

  if (items.length > 0) {
    const item = items[0];
    console.log('Testing Joins for item_id:', item.id);

    const [orders] = await pool.query(`SELECT id, shipping_address_id, user_id FROM orders WHERE id = ?`, [item.order_id]);
    console.log('Order:', orders);

    const [customers] = await pool.query(`SELECT id FROM users WHERE id = ?`, [orders[0]?.user_id]);
    console.log('Customer User:', customers);

    const [addresses] = await pool.query(`SELECT id FROM addresses WHERE id = ?`, [orders[0]?.shipping_address_id]);
    console.log('Address:', addresses);

    const [vendors] = await pool.query(`SELECT id FROM users WHERE id = ?`, [item.vendor_id]);
    console.log('Vendor User:', vendors);

    const [products] = await pool.query(`SELECT id FROM products WHERE id = ?`, [item.product_id]);
    console.log('Product:', products);
    
    const [profiles] = await pool.query(`SELECT user_id FROM vendor_profiles WHERE user_id = ?`, [item.vendor_id]);
    console.log('Vendor Profile (LEFT JOIN):', profiles);

    const query = `
      SELECT oi.id
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN users cu ON o.user_id = cu.id
      JOIN addresses ca ON o.shipping_address_id = ca.id
      JOIN users vu ON oi.vendor_id = vu.id
      LEFT JOIN vendor_profiles vp ON vu.id = vp.user_id
      JOIN products p ON oi.product_id = p.id
      WHERE oi.item_status IN ('ACCEPTED', 'READY_FOR_DISPATCH', 'DISPATCH_REQUEST_SENT', 'WAITING_FOR_PICKUP', 'PACKAGE_COLLECTED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY')
    `;
    const [rows] = await pool.query(query);
    console.log('Full Query Result Count:', rows.length);
  }

  process.exit(0);
}
test().catch(console.error);
