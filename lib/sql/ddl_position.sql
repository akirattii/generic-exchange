-- Positions
CREATE TABLE IF NOT EXISTS `position` (
  id INT NOT NULL AUTO_INCREMENT,
  userId INT NOT NULL,
  base CHAR(3) NOT NULL, -- a currency name an user hold
  qty BIGINT NOT NULL, -- a user's currency position quantity
  createdAt BIGINT NOT NULL,
  updatedAt BIGINT NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE position ADD INDEX idx_position_userId(`userId`);
ALTER TABLE position ADD UNIQUE idx_position_userId_base(`userId`,`base`);
