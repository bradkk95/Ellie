-- Migration: Create wishlist table
CREATE TABLE IF NOT EXISTS wishlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_name TEXT NOT NULL,
  emoji TEXT DEFAULT '🎁',
  store TEXT DEFAULT 'other',
  link TEXT,
  price REAL,
  image_url TEXT,
  order_index INTEGER DEFAULT 0,
  purchased INTEGER DEFAULT 0,
  purchased_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wishlist_order ON wishlist(order_index);
CREATE INDEX IF NOT EXISTS idx_wishlist_purchased ON wishlist(purchased);
