CREATE TABLE inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_name VARCHAR(255),
  external_code VARCHAR(50),
  total_capacity INT,
  sold INT DEFAULT 0,
  locked INT DEFAULT 0
);

CREATE TABLE reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lock_id VARCHAR(100),
  external_code VARCHAR(50),
  status VARCHAR(20),
  ticket_barcode VARCHAR(100)
);

INSERT INTO inventory (product_name, external_code, total_capacity) VALUES ('Passaporte Neve', 'SNOW-001', 500);
