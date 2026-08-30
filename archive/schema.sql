-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
-- Host: localhost    Database: ecommerce_platform
-- ------------------------------------------------------
SET FOREIGN_KEY_CHECKS=0;

-- Table structure for table `addresses`

CREATE TABLE IF NOT EXISTS `addresses` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `type` enum('SHIPPING','BILLING') DEFAULT 'SHIPPING',
  `street` varchar(255) NOT NULL,
  `city` varchar(100) NOT NULL,
  `state` varchar(100) NOT NULL,
  `zip` varchar(20) NOT NULL,
  `country` varchar(100) NOT NULL,
  `is_default` tinyint(1) DEFAULT '0',
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `house_no` varchar(255) DEFAULT NULL,
  `area` varchar(255) DEFAULT NULL,
  `district` varchar(255) DEFAULT NULL,
  `formatted_address` text,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `addresses_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `advertisement_campaigns`

CREATE TABLE IF NOT EXISTS `advertisement_campaigns` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `vendor_id` int unsigned NOT NULL,
  `campaign_type` enum('HOMEPAGE','CATEGORY','SPONSORED_PRODUCT','VIDEO') NOT NULL,
  `title` varchar(255) NOT NULL,
  `banner_url` varchar(255) DEFAULT NULL,
  `target_url` varchar(255) DEFAULT NULL,
  `budget` decimal(10,2) NOT NULL,
  `spent_amount` decimal(10,2) DEFAULT '0.00',
  `start_date` timestamp NOT NULL,
  `end_date` timestamp NOT NULL,
  `status` enum('PENDING','ACTIVE','PAUSED','COMPLETED','CANCELLED') DEFAULT 'PENDING',
  `impressions` int DEFAULT '0',
  `clicks` int DEFAULT '0',
  `conversions` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `vendor_id` (`vendor_id`),
  CONSTRAINT `advertisement_campaigns_ibfk_1` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `advertisements`

CREATE TABLE IF NOT EXISTS `advertisements` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text,
  `image` varchar(255) NOT NULL,
  `mobile_image` varchar(255) DEFAULT NULL,
  `redirect_url` varchar(255) DEFAULT NULL,
  `button_text` varchar(100) DEFAULT NULL,
  `position` enum('HERO_SLIDER','COUPON','GRID_LARGE','GRID_VERTICAL','GRID_HORIZONTAL','SIDEBAR','POPUP','BETWEEN_SECTIONS','BOTTOM') NOT NULL,
  `priority` int DEFAULT '0',
  `start_date` timestamp NULL DEFAULT NULL,
  `end_date` timestamp NULL DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
  `created_by` int unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `advertisements_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `attribute_groups`

CREATE TABLE IF NOT EXISTS `attribute_groups` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `category_id` int unsigned NOT NULL,
  `name` varchar(100) NOT NULL,
  `is_enabled` tinyint(1) DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `attribute_groups_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `attribute_values`

CREATE TABLE IF NOT EXISTS `attribute_values` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `group_id` int unsigned NOT NULL,
  `value` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `group_id` (`group_id`),
  CONSTRAINT `attribute_values_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `attribute_groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `banners`

CREATE TABLE IF NOT EXISTS `banners` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `image_url` varchar(255) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `link_url` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `brands`

CREATE TABLE IF NOT EXISTS `brands` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `cart`

CREATE TABLE IF NOT EXISTS `cart` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `product_id` int unsigned NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_cart_item` (`user_id`,`product_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `cart_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cart_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=91 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `catalog_products`

CREATE TABLE IF NOT EXISTS `catalog_products` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `vendor_id` int unsigned NOT NULL,
  `category_id` int unsigned NOT NULL,
  `name` varchar(500) NOT NULL,
  `brand` varchar(255) DEFAULT NULL,
  `slug` varchar(600) NOT NULL,
  `status` enum('ACTIVE','INACTIVE','DRAFT') DEFAULT 'ACTIVE',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_catalog_slug` (`slug`),
  KEY `idx_vendor` (`vendor_id`),
  KEY `idx_category` (`category_id`),
  CONSTRAINT `catalog_products_ibfk_1` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `catalog_products_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `categories`

CREATE TABLE IF NOT EXISTS `categories` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `parent_id` int unsigned DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `gst_rate` decimal(5,2) DEFAULT '18.00',
  `margin_percentage` decimal(5,2) DEFAULT '0.00',
  `margin_description` text,
  `gst_percentage` decimal(5,2) DEFAULT '0.00',
  `youtube_video_link` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `parent_id` (`parent_id`),
  CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `category_attribute_templates`

CREATE TABLE IF NOT EXISTS `category_attribute_templates` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `category_id` int unsigned NOT NULL,
  `attribute_key` varchar(255) NOT NULL,
  `attribute_label` varchar(255) NOT NULL,
  `input_type` enum('text','number','select','boolean','textarea') DEFAULT 'text',
  `options` text,
  `is_required` tinyint(1) DEFAULT '0',
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category_id`),
  CONSTRAINT `category_attribute_templates_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `category_attributes`

CREATE TABLE IF NOT EXISTS `category_attributes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `category_id` int unsigned NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `category_attributes_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=171 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `category_hsn_mapping`

CREATE TABLE IF NOT EXISTS `category_hsn_mapping` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `category_id` int unsigned NOT NULL,
  `hsn_code_id` int unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_id` (`category_id`),
  KEY `hsn_code_id` (`hsn_code_id`),
  CONSTRAINT `category_hsn_mapping_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `category_hsn_mapping_ibfk_2` FOREIGN KEY (`hsn_code_id`) REFERENCES `hsn_codes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `chat_messages`

CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `sender_id` int unsigned NOT NULL,
  `receiver_id` int unsigned NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `sender_id` (`sender_id`),
  KEY `receiver_id` (`receiver_id`),
  CONSTRAINT `chat_messages_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chat_messages_ibfk_2` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `coupons`

CREATE TABLE IF NOT EXISTS `coupons` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `vendor_id` int unsigned DEFAULT NULL,
  `type` enum('PERCENTAGE','FIXED') NOT NULL,
  `value` decimal(10,2) NOT NULL,
  `min_cart_value` decimal(10,2) DEFAULT '0.00',
  `max_discount` decimal(10,2) DEFAULT NULL,
  `valid_from` timestamp NOT NULL,
  `valid_to` timestamp NOT NULL,
  `status` enum('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `vendor_id` (`vendor_id`),
  CONSTRAINT `coupons_ibfk_1` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `documents`

CREATE TABLE IF NOT EXISTS `documents` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `model_id` int unsigned NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_type` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `model_id` (`model_id`),
  CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`model_id`) REFERENCES `models` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `hsn_codes`

CREATE TABLE IF NOT EXISTS `hsn_codes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `model_features`

CREATE TABLE IF NOT EXISTS `model_features` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `model_id` int unsigned NOT NULL,
  `attribute_key` varchar(255) NOT NULL,
  `attribute_value` text,
  PRIMARY KEY (`id`),
  KEY `model_id` (`model_id`),
  CONSTRAINT `model_features_ibfk_1` FOREIGN KEY (`model_id`) REFERENCES `product_models` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `model_highlights`

CREATE TABLE IF NOT EXISTS `model_highlights` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `model_id` int unsigned NOT NULL,
  `highlight` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `model_id` (`model_id`),
  CONSTRAINT `model_highlights_ibfk_1` FOREIGN KEY (`model_id`) REFERENCES `models` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `model_images`

CREATE TABLE IF NOT EXISTS `model_images` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `model_id` int unsigned NOT NULL,
  `image_url` varchar(255) NOT NULL,
  `image_type` varchar(100) DEFAULT 'GALLERY',
  `sort_order` int NOT NULL DEFAULT '0',
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `alt_text` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `model_id` (`model_id`),
  CONSTRAINT `model_images_ibfk_1` FOREIGN KEY (`model_id`) REFERENCES `models` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `model_specifications`

CREATE TABLE IF NOT EXISTS `model_specifications` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `model_id` int unsigned NOT NULL,
  `attribute_id` int unsigned NOT NULL,
  `value` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `model_id` (`model_id`),
  KEY `attribute_id` (`attribute_id`),
  CONSTRAINT `model_specifications_ibfk_1` FOREIGN KEY (`model_id`) REFERENCES `models` (`id`) ON DELETE CASCADE,
  CONSTRAINT `model_specifications_ibfk_2` FOREIGN KEY (`attribute_id`) REFERENCES `category_attributes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=70 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `model_variants`

CREATE TABLE IF NOT EXISTS `model_variants` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `model_id` int unsigned NOT NULL,
  `product_id` int unsigned NOT NULL,
  `vendor_id` int unsigned NOT NULL,
  `name` varchar(500) NOT NULL,
  `sku` varchar(150) DEFAULT NULL,
  `barcode` varchar(100) DEFAULT NULL,
  `color` varchar(100) DEFAULT NULL,
  `size` varchar(100) DEFAULT NULL,
  `storage` varchar(100) DEFAULT NULL,
  `ram` varchar(100) DEFAULT NULL,
  `material` varchar(100) DEFAULT NULL,
  `custom_attr1_key` varchar(100) DEFAULT NULL,
  `custom_attr1_value` varchar(255) DEFAULT NULL,
  `custom_attr2_key` varchar(100) DEFAULT NULL,
  `custom_attr2_value` varchar(255) DEFAULT NULL,
  `mrp` decimal(12,2) DEFAULT '0.00',
  `price` decimal(12,2) DEFAULT '0.00',
  `offer_price` decimal(12,2) DEFAULT NULL,
  `stock` int NOT NULL DEFAULT '0',
  `moq` int DEFAULT '1',
  `weight` decimal(10,3) DEFAULT NULL,
  `status` enum('Active','Inactive','Out of Stock') DEFAULT 'Active',
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`),
  KEY `idx_model` (`model_id`),
  KEY `idx_product` (`product_id`),
  KEY `vendor_id` (`vendor_id`),
  CONSTRAINT `model_variants_ibfk_1` FOREIGN KEY (`model_id`) REFERENCES `product_models` (`id`) ON DELETE CASCADE,
  CONSTRAINT `model_variants_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `catalog_products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `model_variants_ibfk_3` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `models`

CREATE TABLE IF NOT EXISTS `models` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `product_id` int unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `description` text,
  `warranty` varchar(255) DEFAULT NULL,
  `replacement_policy` varchar(100) DEFAULT NULL,
  `replacement_days` int unsigned DEFAULT NULL,
  `return_policy` text,
  `return_days` int unsigned DEFAULT NULL,
  `whats_in_the_box` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `public_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `public_id` (`public_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `models_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `order_items`

CREATE TABLE IF NOT EXISTS `order_items` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int unsigned NOT NULL,
  `product_id` int unsigned NOT NULL,
  `vendor_id` int unsigned NOT NULL,
  `quantity` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `product_id` (`product_id`),
  KEY `vendor_id` (`vendor_id`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `order_items_ibfk_3` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `orders`

CREATE TABLE IF NOT EXISTS `orders` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `shipping_address_id` int unsigned NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `coupon_id` int unsigned DEFAULT NULL,
  `discount_amount` decimal(10,2) DEFAULT '0.00',
  `payment_method` enum('COD','UPI','RAZORPAY','STRIPE') NOT NULL,
  `payment_status` enum('PENDING','PAID','FAILED','REFUNDED') DEFAULT 'PENDING',
  `order_status` enum('PLACED','PACKED','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','RETURNED') DEFAULT 'PLACED',
  `tracking_timeline` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `shipping_address_id` (`shipping_address_id`),
  KEY `coupon_id` (`coupon_id`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`shipping_address_id`) REFERENCES `addresses` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `orders_ibfk_3` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `payments`

CREATE TABLE IF NOT EXISTS `payments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_gateway` varchar(50) NOT NULL,
  `transaction_id` varchar(255) DEFAULT NULL,
  `status` enum('PENDING','SUCCESS','FAILED','REFUNDED') DEFAULT 'PENDING',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `product_models`

CREATE TABLE IF NOT EXISTS `product_models` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `product_id` int unsigned NOT NULL,
  `vendor_id` int unsigned NOT NULL,
  `name` varchar(500) NOT NULL,
  `sku` varchar(150) DEFAULT NULL,
  `condition_type` enum('New','Refurbished','Used') DEFAULT 'New',
  `short_description` text,
  `description` longtext,
  `warranty` varchar(500) DEFAULT NULL,
  `return_policy` varchar(500) DEFAULT NULL,
  `whats_in_box` text,
  `mrp` decimal(12,2) DEFAULT '0.00',
  `price` decimal(12,2) DEFAULT '0.00',
  `offer_price` decimal(12,2) DEFAULT NULL,
  `gst_percentage` decimal(5,2) DEFAULT '18.00',
  `hsn_code` varchar(100) DEFAULT NULL,
  `weight` decimal(10,3) DEFAULT NULL,
  `length_cm` decimal(10,2) DEFAULT NULL,
  `width_cm` decimal(10,2) DEFAULT NULL,
  `height_cm` decimal(10,2) DEFAULT NULL,
  `shipping_class` varchar(100) DEFAULT 'Standard',
  `cod_available` tinyint(1) DEFAULT '1',
  `free_shipping` tinyint(1) DEFAULT '0',
  `stock` int NOT NULL DEFAULT '0',
  `status` enum('ACTIVE','INACTIVE','DRAFT') DEFAULT 'ACTIVE',
  `seo_slug` varchar(600) DEFAULT NULL,
  `seo_meta_title` varchar(500) DEFAULT NULL,
  `seo_meta_description` text,
  `seo_keywords` text,
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_product` (`product_id`),
  KEY `idx_vendor` (`vendor_id`),
  CONSTRAINT `product_models_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `catalog_products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_models_ibfk_2` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `product_types`

CREATE TABLE IF NOT EXISTS `product_types` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `category_id` int unsigned NOT NULL,
  `hsn_code_id` int unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `category_id` (`category_id`),
  KEY `hsn_code_id` (`hsn_code_id`),
  CONSTRAINT `product_types_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_types_ibfk_2` FOREIGN KEY (`hsn_code_id`) REFERENCES `hsn_codes` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `products`

CREATE TABLE IF NOT EXISTS `products` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `vendor_id` int unsigned NOT NULL,
  `category_id` int unsigned NOT NULL,
  `sub_category_id` int unsigned DEFAULT NULL,
  `brand_id` int unsigned DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `barcode` varchar(100) DEFAULT NULL,
  `images` longtext,
  `thumbnail` longtext,
  `video_url` varchar(255) DEFAULT NULL,
  `short_description` text,
  `description` text,
  `specifications` json DEFAULT NULL,
  `highlights` json DEFAULT NULL,
  `features` json DEFAULT NULL,
  `warranty` varchar(255) DEFAULT NULL,
  `return_policy` varchar(255) DEFAULT NULL,
  `weight` decimal(10,2) DEFAULT NULL,
  `dimensions` json DEFAULT NULL,
  `stock` int NOT NULL DEFAULT '0',
  `variants` json DEFAULT NULL,
  `mrp` decimal(10,2) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `offer_price` decimal(10,2) DEFAULT NULL,
  `gst_percentage` decimal(5,2) DEFAULT '0.00',
  `shipping_details` json DEFAULT NULL,
  `seo_details` json DEFAULT NULL,
  `status` enum('DRAFT','PENDING','PUBLISHED','OUT_OF_STOCK') DEFAULT 'DRAFT',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `sub_category` varchar(255) DEFAULT NULL,
  `brand` varchar(255) DEFAULT NULL,
  `manufacturer` varchar(255) DEFAULT NULL,
  `hsn_code` varchar(100) DEFAULT NULL,
  `public_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  UNIQUE KEY `sku` (`sku`),
  UNIQUE KEY `barcode` (`barcode`),
  UNIQUE KEY `public_id` (`public_id`),
  KEY `vendor_id` (`vendor_id`),
  KEY `category_id` (`category_id`),
  KEY `sub_category_id` (`sub_category_id`),
  KEY `brand_id` (`brand_id`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `products_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `products_ibfk_3` FOREIGN KEY (`sub_category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `products_ibfk_4` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `reviews`

CREATE TABLE IF NOT EXISTS `reviews` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `product_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  `rating` tinyint unsigned NOT NULL,
  `comment` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_review` (`product_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reviews_chk_1` CHECK (((`rating` >= 1) and (`rating` <= 5)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `seller_sku_sequences`

CREATE TABLE IF NOT EXISTS `seller_sku_sequences` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `prefix` varchar(100) NOT NULL,
  `current_value` int unsigned NOT NULL DEFAULT '0',
  `number_length` int unsigned NOT NULL DEFAULT '6',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `prefix` (`prefix`)
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `seo`

CREATE TABLE IF NOT EXISTS `seo` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `model_id` int unsigned NOT NULL,
  `slug` varchar(255) NOT NULL,
  `meta_title` varchar(255) DEFAULT NULL,
  `meta_description` text,
  `keywords` varchar(255) DEFAULT NULL,
  `canonical_url` varchar(255) DEFAULT NULL,
  `og_title` varchar(255) DEFAULT NULL,
  `twitter_card_type` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `model_id` (`model_id`),
  CONSTRAINT `seo_ibfk_1` FOREIGN KEY (`model_id`) REFERENCES `models` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `service_enquiries`

CREATE TABLE IF NOT EXISTS `service_enquiries` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `service_id` int unsigned NOT NULL,
  `vendor_id` int unsigned NOT NULL,
  `type` enum('ENQUIRY','BOOKING') DEFAULT 'ENQUIRY',
  `status` enum('ENQUIRY_SUBMITTED','SERVICE_REQUESTED','ACCEPTED','REJECTED','COMPLETED') DEFAULT 'ENQUIRY_SUBMITTED',
  `address_id` int unsigned DEFAULT NULL,
  `reject_reason` text,
  `is_read` tinyint(1) DEFAULT '0',
  `completed_at` timestamp NULL DEFAULT NULL,
  `customer_name` varchar(255) NOT NULL,
  `customer_phone` varchar(50) NOT NULL,
  `customer_id` int unsigned DEFAULT NULL,
  `enquiry_text` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `service_id` (`service_id`),
  KEY `vendor_id` (`vendor_id`),
  KEY `address_id` (`address_id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `service_enquiries_ibfk_1` FOREIGN KEY (`service_id`) REFERENCES `vendor_services` (`id`) ON DELETE CASCADE,
  CONSTRAINT `service_enquiries_ibfk_2` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `service_enquiries_ibfk_3` FOREIGN KEY (`address_id`) REFERENCES `addresses` (`id`) ON DELETE SET NULL,
  CONSTRAINT `service_enquiries_ibfk_4` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `spin_wheel_rewards`

CREATE TABLE IF NOT EXISTS `spin_wheel_rewards` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `reward_type` enum('COUPON','WALLET_CASH','LOYALTY_POINTS','NO_REWARD') NOT NULL,
  `reward_value` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `spin_wheel_rewards_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `subscription_plans`

CREATE TABLE IF NOT EXISTS `subscription_plans` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `tier` enum('BASIC','SILVER','GOLD','PLATINUM','ENTERPRISE') NOT NULL,
  `monthly_price` decimal(10,2) NOT NULL,
  `yearly_price` decimal(10,2) NOT NULL,
  `product_limit` int NOT NULL DEFAULT '0',
  `image_limit` int NOT NULL DEFAULT '5',
  `storage_limit` int NOT NULL DEFAULT '100',
  `ad_credits` decimal(10,2) DEFAULT '0.00',
  `featured_listing` tinyint(1) DEFAULT '0',
  `homepage_listing` tinyint(1) DEFAULT '0',
  `premium_badge` tinyint(1) DEFAULT '0',
  `analytics_access` tinyint(1) DEFAULT '0',
  `bulk_upload` tinyint(1) DEFAULT '0',
  `bulk_export` tinyint(1) DEFAULT '0',
  `ai_description` tinyint(1) DEFAULT '0',
  `commission_percentage` decimal(5,2) NOT NULL DEFAULT '10.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `free_business_limit` decimal(15,2) DEFAULT '1000000.00',
  `service_charge_percentage` decimal(5,2) DEFAULT '5.00',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `support_messages`

CREATE TABLE IF NOT EXISTS `support_messages` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `ticket_id` int unsigned NOT NULL,
  `sender_id` int unsigned NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ticket_id` (`ticket_id`),
  CONSTRAINT `support_messages_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `support_tickets`

CREATE TABLE IF NOT EXISTS `support_tickets` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `ticket_number` varchar(50) NOT NULL,
  `user_id` int unsigned NOT NULL,
  `subject` varchar(255) NOT NULL,
  `status` enum('PENDING','IN_PROGRESS','RESOLVED') DEFAULT 'PENDING',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ticket_number` (`ticket_number`),
  KEY `idx_ticket_number` (`ticket_number`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `uploaded_images`

CREATE TABLE IF NOT EXISTS `uploaded_images` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `module` varchar(50) NOT NULL,
  `entity_id` int unsigned DEFAULT NULL,
  `original_name` varchar(255) DEFAULT NULL,
  `optimized_name` varchar(255) DEFAULT NULL,
  `alt_text` varchar(500) DEFAULT NULL,
  `seo_title` varchar(255) DEFAULT NULL,
  `image_width` int unsigned DEFAULT NULL,
  `image_height` int unsigned DEFAULT NULL,
  `file_size` int unsigned DEFAULT NULL,
  `mime_type` varchar(50) DEFAULT 'image/webp',
  `sizes` json DEFAULT NULL,
  `is_primary` tinyint(1) DEFAULT '0',
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_module_entity` (`module`,`entity_id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `user_search_events`

CREATE TABLE IF NOT EXISTS `user_search_events` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned DEFAULT NULL,
  `session_id` varchar(128) DEFAULT NULL,
  `query` varchar(500) NOT NULL DEFAULT '',
  `product_id` int unsigned DEFAULT NULL,
  `variant_id` int unsigned DEFAULT NULL,
  `event_type` enum('SEARCH','CLICK','CART_ADD') DEFAULT 'SEARCH',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_query` (`query`(100)),
  KEY `idx_product` (`product_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_event_type` (`event_type`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `users`

CREATE TABLE IF NOT EXISTS `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `profile_photo` varchar(255) DEFAULT NULL,
  `role` enum('USER','VENDOR','ADMIN','SUPER_ADMIN','TECHNICAL_SUPPORT') DEFAULT 'USER',
  `status` enum('ACTIVE','INACTIVE','BANNED') DEFAULT 'ACTIVE',
  `is_approved` tinyint(1) DEFAULT '0',
  `wallet_balance` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_suspended` tinyint(1) DEFAULT '0',
  `suspension_reason` text,
  `public_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `public_id` (`public_id`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `variant_images`

CREATE TABLE IF NOT EXISTS `variant_images` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `variant_id` int unsigned NOT NULL,
  `image_url` varchar(255) NOT NULL,
  `is_main` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `image_type` varchar(100) DEFAULT 'GALLERY',
  `sort_order` int NOT NULL DEFAULT '0',
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `alt_text` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `variant_id` (`variant_id`),
  CONSTRAINT `variant_images_ibfk_1` FOREIGN KEY (`variant_id`) REFERENCES `variants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=126 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `variants`

CREATE TABLE IF NOT EXISTS `variants` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `model_id` int unsigned NOT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `barcode` varchar(100) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `mrp` decimal(10,2) NOT NULL,
  `stock` int NOT NULL DEFAULT '0',
  `status` enum('DRAFT','PENDING','PUBLISHED','OUT_OF_STOCK') DEFAULT 'PUBLISHED',
  `attributes` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `name` varchar(255) DEFAULT NULL,
  `description` text,
  `highlights` json DEFAULT NULL,
  `warranty` varchar(255) DEFAULT NULL,
  `whats_in_the_box` text,
  `specifications` json DEFAULT NULL,
  `public_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`),
  UNIQUE KEY `public_id` (`public_id`),
  KEY `model_id` (`model_id`),
  CONSTRAINT `variants_ibfk_1` FOREIGN KEY (`model_id`) REFERENCES `models` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `vendor_profiles`

CREATE TABLE IF NOT EXISTS `vendor_profiles` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `vendor_type` enum('PRODUCT','SERVICE','ADVERTISEMENT') DEFAULT 'PRODUCT',
  `business_name` varchar(255) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `subcategory` varchar(100) DEFAULT NULL,
  `gst_number` varchar(50) DEFAULT NULL,
  `pan_number` varchar(50) DEFAULT NULL,
  `aadhaar_number` varchar(50) DEFAULT NULL,
  `bank_account` varchar(100) DEFAULT NULL,
  `ifsc_code` varchar(20) DEFAULT NULL,
  `upi_id` varchar(100) DEFAULT NULL,
  `business_logo` varchar(255) DEFAULT NULL,
  `store_banner` varchar(255) DEFAULT NULL,
  `gallery_images` json DEFAULT NULL,
  `store_description` text,
  `business_address` text,
  `pickup_address` text,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `pincode` varchar(20) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `whatsapp_number` varchar(20) DEFAULT NULL,
  `social_links` json DEFAULT NULL,
  `working_hours` varchar(255) DEFAULT NULL,
  `kyc_documents` json DEFAULT NULL,
  `kyc_status` enum('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `account_holder_name` varchar(255) DEFAULT NULL,
  `bank_name` varchar(255) DEFAULT NULL,
  `branch_location` varchar(255) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `house_no` varchar(255) DEFAULT NULL,
  `area` varchar(255) DEFAULT NULL,
  `district` varchar(255) DEFAULT NULL,
  `formatted_address` text,
  `public_id` varchar(50) DEFAULT NULL,
  `slug` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `public_id` (`public_id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `vendor_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `vendor_services`

CREATE TABLE IF NOT EXISTS `vendor_services` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `vendor_id` int unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `experience` varchar(100) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `description` text,
  `image_path` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `public_id` varchar(50) DEFAULT NULL,
  `slug` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `public_id` (`public_id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `vendor_id` (`vendor_id`),
  CONSTRAINT `vendor_services_ibfk_1` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `vendor_subscriptions`

CREATE TABLE IF NOT EXISTS `vendor_subscriptions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `vendor_id` int unsigned NOT NULL,
  `plan_id` int unsigned NOT NULL,
  `status` enum('ACTIVE','EXPIRED','CANCELLED') DEFAULT 'ACTIVE',
  `start_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expiry_date` timestamp NOT NULL,
  `auto_renewal` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `vendor_id` (`vendor_id`),
  KEY `plan_id` (`plan_id`),
  CONSTRAINT `vendor_subscriptions_ibfk_1` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `vendor_subscriptions_ibfk_2` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `videos`

CREATE TABLE IF NOT EXISTS `videos` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `model_id` int unsigned NOT NULL,
  `video_url` varchar(255) NOT NULL,
  `video_type` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `model_id` (`model_id`),
  CONSTRAINT `videos_ibfk_1` FOREIGN KEY (`model_id`) REFERENCES `models` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `wallet_transactions`

CREATE TABLE IF NOT EXISTS `wallet_transactions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `type` enum('CREDIT','DEBIT') NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `status` enum('PENDING','SUCCESS','FAILED') DEFAULT 'SUCCESS',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `wallet_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `wishlist`

CREATE TABLE IF NOT EXISTS `wishlist` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `product_id` int unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_wishlist_item` (`user_id`,`product_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `wishlist_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `wishlist_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS=1;
-- Dump completed on 2026-07-23 10:44:39
