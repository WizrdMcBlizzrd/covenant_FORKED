CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_active_unique_inscription_id
  ON orders(inscription_id)
  WHERE status IN ('pending', 'confirmed');
