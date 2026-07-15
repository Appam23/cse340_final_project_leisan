INSERT INTO vehicles
(category_id, make, model, year, color, mileage, price, description, featured)
SELECT c.id, v.make, v.model, v.year, v.color, v.mileage, v.price, v.description, v.featured
FROM (
  VALUES
    ('Sedan','BMW','3 Series',2022,'White',18000,41995.00,'Luxury sport sedan with excellent handling',true),
    ('SUV','BMW','X5',2021,'Black',26000,52995.00,'Premium midsize SUV with strong performance',false),
    ('Sedan','Mercedes-Benz','C-Class',2021,'Silver',24000,43995.00,'Refined luxury sedan with modern tech',true),
    ('SUV','Mercedes-Benz','GLE 350',2020,'Gray',34000,49995.00,'Spacious luxury SUV with smooth ride',false),
    ('Sedan','Porsche','Panamera',2020,'Blue',22000,78995.00,'High-performance luxury sedan',true),
    ('SUV','Porsche','Cayenne',2021,'Red',21000,69995.00,'Sporty luxury SUV with premium interior',true)
) AS v(category,make,model,year,color,mileage,price,description,featured)
JOIN categories c ON c.name = v.category
WHERE NOT EXISTS (
  SELECT 1 FROM vehicles x
  WHERE x.make = v.make AND x.model = v.model AND x.year = v.year
);