ALTER TABLE sales_log
ADD COLUMN IF NOT EXISTS batch_id text;

ALTER TABLE sales_log
ADD COLUMN IF NOT EXISTS undone boolean DEFAULT false;

ALTER TABLE sales_log
ADD COLUMN IF NOT EXISTS undone_at timestamp;

ALTER TABLE sales_log
ADD COLUMN IF NOT EXISTS stock_id uuid;

CREATE INDEX IF NOT EXISTS idx_sales_log_batch_id ON sales_log (batch_id);
CREATE INDEX IF NOT EXISTS idx_sales_log_undone ON sales_log (undone);
