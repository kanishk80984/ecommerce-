import pool from './config/db.js';

async function migrate() {
  const connection = await pool.getConnection();
  try {
    console.log('Starting V2 Returns Migration...');
    await connection.beginTransaction();

    // 1. Update ENUM for return_requests
    console.log('Updating status ENUM in return_requests...');
    await connection.query(`
      ALTER TABLE return_requests MODIFY COLUMN status ENUM(
        'REQUESTED', 'VENDOR_REVIEW', 'APPROVED', 'REJECTED', 
        'PICKUP_SCHEDULED', 'RETURN_PICKED_UP', 'RETURN_COMPLETED', 
        'REPLACEMENT_SHIPPED', 'REPLACEMENT_DELIVERED', 'REFUNDED',
        'INSPECTION', 'RETURN_RECEIVED', 'RETURN_IN_TRANSIT', 'REFUND_PROCESSING', 'SENT_TO_DELIVERY',
        'RETURN_APPROVED', 'RETURN_REJECTED', 'PICKUP_COMPLETED', 
        'INSPECTION_APPROVED', 'INSPECTION_REJECTED', 'REPLACEMENT_READY', 
        'REFUND_APPROVED', 'REFUND_REJECTED', 'REPLACEMENT_ORDER_CREATED', 'REFUND_COMPLETED'
      ) DEFAULT 'REQUESTED'
    `);

    // 2. Add columns to return_requests if they don't exist
    const [cols] = await connection.query("SHOW COLUMNS FROM return_requests");
    const colNames = cols.map(c => c.Field);

    if (!colNames.includes('replacement_order_id')) {
      console.log('Adding replacement_order_id...');
      await connection.query('ALTER TABLE return_requests ADD COLUMN replacement_order_id INT UNSIGNED DEFAULT NULL');
      await connection.query('ALTER TABLE return_requests ADD CONSTRAINT fk_replacement_order FOREIGN KEY (replacement_order_id) REFERENCES orders(id) ON DELETE SET NULL');
    }

    if (!colNames.includes('vendor_inspection_remarks')) {
      console.log('Adding vendor_inspection_remarks...');
      await connection.query('ALTER TABLE return_requests ADD COLUMN vendor_inspection_remarks TEXT DEFAULT NULL');
    }

    if (!colNames.includes('admin_verification_remarks')) {
      console.log('Adding admin_verification_remarks...');
      await connection.query('ALTER TABLE return_requests ADD COLUMN admin_verification_remarks TEXT DEFAULT NULL');
    }

    // 3. Update order_items item_status ENUM
    console.log('Updating item_status ENUM in order_items...');
    await connection.query(`
      ALTER TABLE order_items MODIFY COLUMN item_status ENUM(
        'PENDING', 'DISPATCH_REQUEST_SENT', 'WAITING_FOR_PICKUP', 'IN_TRANSIT',
        'PLACED', 'CONFIRMED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED',
        'RETURN_REQUESTED', 'RETURN_APPROVED', 'PICKUP_SCHEDULED', 
        'PICKUP_COMPLETED', 'RETURN_IN_TRANSIT', 'RETURN_RECEIVED', 
        'INSPECTION', 'REFUND_PROCESSING', 'REFUND_COMPLETED', 'RETURN_REJECTED', 'RETURN_COMPLETED', 'ACCEPTED',
        'READY_FOR_DISPATCH', 'PACKAGE_COLLECTED', 'CANCELLED',
        'INSPECTION_APPROVED', 'INSPECTION_REJECTED', 'REPLACEMENT_READY',
        'REFUND_APPROVED', 'REFUND_REJECTED', 'REPLACEMENT_ORDER_CREATED'
      ) DEFAULT 'PLACED'
    `);

    await connection.commit();
    console.log('Migration successfully completed!');
  } catch (error) {
    await connection.rollback();
    console.error('Migration failed:', error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

migrate();
