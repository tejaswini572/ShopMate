begin;

delete from stock
where name in (
  'Soap',
  'Rice bag 5kg',
  'Coconut Oil 500ml',
  'Pepsi 250ml',
  'Surf Excel 1kg',
  'Sugar 1kg',
  'Tea powder 100g',
  'Aval Rice flakes',
  'Maggi noodles',
  'Parle-G Biscuit',
  'Ghee 500ml',
  'Atta 5kg',
  'Salt 1kg',
  'Turmeric 100g',
  'Mustard oil 1L',
  'Horlicks 200g',
  'Chilli powder 100g',
  'Candle',
  'Pen',
  'Notebook'
);

insert into stock (name, quantity, unit, min_stock, buy_price, sell_price)
values
  ('Soap', 18, 'piece', 6, 28, 35),
  ('Rice bag 5kg', 6, 'bag', 5, 245, 280),
  ('Coconut Oil 500ml', 9, 'bottle', 4, 180, 210),
  ('Pepsi 250ml', 24, 'bottle', 8, 18, 25),
  ('Surf Excel 1kg', 7, 'packet', 4, 205, 235),
  ('Sugar 1kg', 14, 'packet', 5, 42, 48),
  ('Tea powder 100g', 11, 'packet', 4, 52, 62),
  ('Aval Rice flakes', 10, 'packet', 4, 38, 45),
  ('Maggi noodles', 30, 'packet', 10, 11, 14),
  ('Parle-G Biscuit', 26, 'packet', 8, 8, 10),
  ('Ghee 500ml', 4, 'bottle', 3, 310, 355),
  ('Atta 5kg', 8, 'bag', 4, 215, 250),
  ('Salt 1kg', 16, 'packet', 5, 16, 20),
  ('Turmeric 100g', 12, 'packet', 4, 24, 30),
  ('Mustard oil 1L', 6, 'bottle', 3, 155, 180),
  ('Horlicks 200g', 5, 'jar', 4, 145, 170),
  ('Chilli powder 100g', 9, 'packet', 4, 36, 44),
  ('Candle', 20, 'piece', 6, 8, 12),
  ('Pen', 25, 'piece', 10, 6, 10),
  ('Notebook', 15, 'piece', 5, 32, 40);

commit;
