create table if not exists stock (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  quantity numeric default 0,
  unit text default 'piece',
  min_stock numeric default 5,
  buy_price numeric default 0,
  sell_price numeric default 0,
  updated_at timestamp default now()
);

create table if not exists sales_log (
  id uuid primary key default gen_random_uuid(),
  product_name text,
  qty_sold numeric,
  sell_price numeric default 0,
  sold_at timestamp default now()
);

create index if not exists stock_name_idx on stock (name);
create index if not exists sales_log_sold_at_idx on sales_log (sold_at);
