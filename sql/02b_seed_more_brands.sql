INSERT INTO vehicles
(category_id, make, model, year, price, mileage, description, availability)
SELECT c.id, v.make, v.model, v.year, v.price, v.mileage, v.description, true
FROM (
  VALUES
    ('Sedan','BMW','3 Series',2022,41995.00,18000,'Luxury sport sedan with excellent handling'),
    ('SUV','BMW','X5',2021,52995.00,26000,'Premium midsize SUV with strong performance'),
    ('Sedan','Mercedes-Benz','C-Class',2021,43995.00,24000,'Refined luxury sedan with modern tech'),
    ('SUV','Mercedes-Benz','GLE 350',2020,49995.00,34000,'Spacious luxury SUV with smooth ride'),
    ('Sedan','Porsche','Panamera',2020,78995.00,22000,'High-performance luxury sedan'),
    ('SUV','Porsche','Cayenne',2021,69995.00,21000,'Sporty luxury SUV with premium interior')
) AS v(category,make,model,year,price,mileage,description)
JOIN categories c ON c.name = v.category
WHERE NOT EXISTS (
  SELECT 1 FROM vehicles x
  WHERE x.make = v.make AND x.model = v.model AND x.year = v.year
);
