CREATE DATABASE IF NOT EXISTS pandren;
USE pandren;

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role ENUM('CUSTOMER', 'VENDOR', 'ADMIN', 'SUPER_ADMIN') DEFAULT 'CUSTOMER',
  status ENUM('ACTIVE', 'INACTIVE', 'BANNED') DEFAULT 'ACTIVE',
  is_approved BOOLEAN DEFAULT FALSE,
  wallet_balance DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- VENDOR PROFILES TABLE (KYC & Business Details)
CREATE TABLE IF NOT EXISTS vendor_profiles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  vendor_type ENUM('PRODUCT', 'ADVERTISEMENT') DEFAULT 'PRODUCT',
  business_name VARCHAR(255) NOT NULL,
  gst_number VARCHAR(50),
  pan_number VARCHAR(50),
  aadhaar_number VARCHAR(50),
  bank_account VARCHAR(100),
  ifsc_code VARCHAR(20),
  upi_id VARCHAR(100),
  business_logo VARCHAR(255),
  store_banner VARCHAR(255),
  store_description TEXT,
  business_address TEXT,
  pickup_address TEXT,
  kyc_documents JSON, -- Store paths to uploaded files
  kyc_status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- SUBSCRIPTION PLANS TABLE
CREATE TABLE IF NOT EXISTS subscription_plans (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  tier ENUM('BASIC', 'SILVER', 'GOLD', 'PLATINUM', 'ENTERPRISE') NOT NULL,
  monthly_price DECIMAL(10, 2) NOT NULL,
  yearly_price DECIMAL(10, 2) NOT NULL,
  product_limit INT NOT NULL DEFAULT 0, -- 0 could mean unlimited depending on logic
  image_limit INT NOT NULL DEFAULT 5,
  storage_limit INT NOT NULL DEFAULT 100, -- in MB
  ad_credits DECIMAL(10,2) DEFAULT 0,
  featured_listing BOOLEAN DEFAULT FALSE,
  homepage_listing BOOLEAN DEFAULT FALSE,
  premium_badge BOOLEAN DEFAULT FALSE,
  analytics_access BOOLEAN DEFAULT FALSE,
  bulk_upload BOOLEAN DEFAULT FALSE,
  bulk_export BOOLEAN DEFAULT FALSE,
  ai_description BOOLEAN DEFAULT FALSE,
  commission_percentage DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  free_business_limit DECIMAL(15,2) DEFAULT 1000000.00,
  service_charge_percentage DECIMAL(5,2) DEFAULT 5.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- VENDOR SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS vendor_subscriptions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT UNSIGNED NOT NULL,
  plan_id INT UNSIGNED NOT NULL,
  status ENUM('ACTIVE', 'EXPIRED', 'CANCELLED') DEFAULT 'ACTIVE',
  start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expiry_date TIMESTAMP NOT NULL,
  auto_renewal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT
);

-- ADVERTISEMENT CAMPAIGNS TABLE
CREATE TABLE IF NOT EXISTS advertisement_campaigns (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT UNSIGNED NOT NULL,
  campaign_type ENUM('HOMEPAGE', 'CATEGORY', 'SPONSORED_PRODUCT', 'VIDEO') NOT NULL,
  title VARCHAR(255) NOT NULL,
  banner_url VARCHAR(255),
  target_url VARCHAR(255),
  budget DECIMAL(10,2) NOT NULL,
  spent_amount DECIMAL(10,2) DEFAULT 0,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  status ENUM('PENDING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  conversions INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  parent_id INT UNSIGNED NULL,
  image VARCHAR(255),
  status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- BRANDS TABLE
CREATE TABLE IF NOT EXISTS brands (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  logo VARCHAR(255),
  status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PRODUCTS TABLE (Advanced)
CREATE TABLE IF NOT EXISTS products (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  sub_category_id INT UNSIGNED NULL,
  brand_id INT UNSIGNED NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  sku VARCHAR(100) UNIQUE,
  barcode VARCHAR(100) UNIQUE,
  images JSON,
  thumbnail VARCHAR(255),
  video_url VARCHAR(255),
  short_description TEXT,
  description TEXT,
  specifications JSON,
  highlights JSON,
  features JSON,
  warranty VARCHAR(255),
  return_policy VARCHAR(255),
  weight DECIMAL(10,2),
  dimensions JSON,
  stock INT NOT NULL DEFAULT 0,
  variants JSON,
  mrp DECIMAL(10, 2) NOT NULL,
  price DECIMAL(10, 2) NOT NULL, -- Selling Price
  offer_price DECIMAL(10, 2),
  gst_percentage DECIMAL(5,2) DEFAULT 0,
  shipping_details JSON,
  seo_details JSON,
  status ENUM('DRAFT', 'PENDING', 'PUBLISHED', 'OUT_OF_STOCK') DEFAULT 'DRAFT',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  FOREIGN KEY (sub_category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL
);

-- MODELS TABLE (Product Model/Variant Groups)
CREATE TABLE IF NOT EXISTS models (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) NULL UNIQUE,
  mrp DECIMAL(10, 2) NULL,
  price DECIMAL(10, 2) NULL,
  offer_price DECIMAL(10, 2) NULL,
  stock INT NOT NULL DEFAULT 0,
  warranty VARCHAR(255) NULL,
  status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- VARIANTS TABLE (SKU-level variants)
CREATE TABLE IF NOT EXISTS variants (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  model_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) NULL UNIQUE,
  mrp DECIMAL(10, 2) NULL,
  price DECIMAL(10, 2) NULL,
  offer_price DECIMAL(10, 2) NULL,
  stock INT NOT NULL DEFAULT 0,
  attributes JSON NULL,
  images JSON NULL,
  thumbnail VARCHAR(255) NULL,
  status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS addresses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  type ENUM('SHIPPING', 'BILLING') DEFAULT 'SHIPPING',
  street VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  zip VARCHAR(20) NOT NULL,
  country VARCHAR(100) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- COUPONS TABLE
CREATE TABLE IF NOT EXISTS coupons (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  vendor_id INT UNSIGNED NULL, -- NULL means platform-wide
  type ENUM('PERCENTAGE', 'FIXED') NOT NULL,
  value DECIMAL(10, 2) NOT NULL,
  min_cart_value DECIMAL(10, 2) DEFAULT 0,
  max_discount DECIMAL(10, 2) NULL,
  valid_from TIMESTAMP NOT NULL,
  valid_to TIMESTAMP NOT NULL,
  status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  shipping_address_id INT UNSIGNED NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  coupon_id INT UNSIGNED NULL,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  payment_method ENUM('COD', 'UPI', 'RAZORPAY', 'STRIPE') NOT NULL,
  payment_status ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
  order_status ENUM('PLACED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED') DEFAULT 'PLACED',
  tracking_timeline JSON, -- Stores array of status updates with timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (shipping_address_id) REFERENCES addresses(id) ON DELETE RESTRICT,
  FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL
);

-- ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  vendor_id INT UNSIGNED NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- CART TABLE
CREATE TABLE IF NOT EXISTS cart (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY unique_cart_item (user_id, product_id)
);

-- WISHLIST TABLE
CREATE TABLE IF NOT EXISTS wishlist (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY unique_wishlist_item (user_id, product_id)
);

-- REVIEWS TABLE
CREATE TABLE IF NOT EXISTS reviews (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  rating TINYINT UNSIGNED NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_review (product_id, user_id)
);

-- PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_gateway VARCHAR(50) NOT NULL,
  transaction_id VARCHAR(255),
  status ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- WALLET TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  type ENUM('CREDIT', 'DEBIT') NOT NULL,
  description VARCHAR(255),
  status ENUM('PENDING', 'SUCCESS', 'FAILED') DEFAULT 'SUCCESS',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS chat_messages (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sender_id INT UNSIGNED NOT NULL,
  receiver_id INT UNSIGNED NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- SUPPORT TICKETS TABLE
CREATE TABLE IF NOT EXISTS support_tickets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') DEFAULT 'OPEN',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- SPIN WHEEL REWARDS TABLE
CREATE TABLE IF NOT EXISTS spin_wheel_rewards (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  reward_type ENUM('COUPON', 'WALLET_CASH', 'LOYALTY_POINTS', 'NO_REWARD') NOT NULL,
  reward_value VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

 - -   B A N N E R S   T A B L E 
 C R E A T E   T A B L E   I F   N O T   E X I S T S   b a n n e r s   ( 
     i d   I N T   U N S I G N E D   A U T O _ I N C R E M E N T   P R I M A R Y   K E Y , 
     i m a g e _ u r l   V A R C H A R ( 2 5 5 )   N O T   N U L L , 
     t i t l e   V A R C H A R ( 2 5 5 ) , 
     l i n k _ u r l   V A R C H A R ( 2 5 5 ) , 
     i s _ a c t i v e   B O O L E A N   D E F A U L T   T R U E , 
     c r e a t e d _ a t   T I M E S T A M P   D E F A U L T   C U R R E N T _ T I M E S T A M P 
 ) ; 
 
 \ n - -   A D V E R T I S E M E N T S   T A B L E \ n C R E A T E   T A B L E   I F   N O T   E X I S T S   a d v e r t i s e m e n t s   ( \ n     i d   I N T   U N S I G N E D   A U T O _ I N C R E M E N T   P R I M A R Y   K E Y , \ n     t i t l e   V A R C H A R ( 2 5 5 )   N O T   N U L L , \ n     d e s c r i p t i o n   T E X T , \ n     i m a g e   V A R C H A R ( 2 5 5 )   N O T   N U L L , \ n     m o b i l e _ i m a g e   V A R C H A R ( 2 5 5 ) , \ n     r e d i r e c t _ u r l   V A R C H A R ( 2 5 5 ) , \ n     b u t t o n _ t e x t   V A R C H A R ( 1 0 0 ) , \ n     p o s i t i o n   E N U M ( ' H E R O _ S L I D E R ' ,   ' C O U P O N ' ,   ' G R I D _ L A R G E ' ,   ' G R I D _ V E R T I C A L ' ,   ' G R I D _ H O R I Z O N T A L ' ,   ' S I D E B A R ' ,   ' P O P U P ' ,   ' B E T W E E N _ S E C T I O N S ' ,   ' B O T T O M ' )   N O T   N U L L , \ n     p r i o r i t y   I N T   D E F A U L T   0 , \ n     s t a r t _ d a t e   T I M E S T A M P   N U L L , \ n     e n d _ d a t e   T I M E S T A M P   N U L L , \ n     s t a t u s   E N U M ( ' A C T I V E ' ,   ' I N A C T I V E ' )   D E F A U L T   ' A C T I V E ' , \ n     c r e a t e d _ b y   I N T   U N S I G N E D , \ n     c r e a t e d _ a t   T I M E S T A M P   D E F A U L T   C U R R E N T _ T I M E S T A M P , \ n     u p d a t e d _ a t   T I M E S T A M P   D E F A U L T   C U R R E N T _ T I M E S T A M P   O N   U P D A T E   C U R R E N T _ T I M E S T A M P , \ n     F O R E I G N   K E Y   ( c r e a t e d _ b y )   R E F E R E N C E S   u s e r s ( i d )   O N   D E L E T E   S E T   N U L L \ n ) ; 
 
 