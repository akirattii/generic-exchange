-- Contracts
CREATE TABLE IF NOT EXISTS `contract` (
  id BIGINT NOT NULL AUTO_INCREMENT,
  userId INT NOT NULL,
  counterUserId INT NOT NULL,
  base CHAR(3) NOT NULL,
  counter CHAR(3) NOT NULL,
  buysell TINYINT NOT NULL DEFAULT 1, -- -1:sell 1:buy
  offerPrice DECIMAL(10,2) NOT NULL, -- user's offer price of this contract
  offerQty BIGINT NOT NULL, -- user's offer qty of this contract
  price DECIMAL(10,2) NOT NULL, -- contract price
  qty BIGINT NOT NULL, -- contract qty
  otc TINYINT NOT NULL DEFAULT 0, -- Over-The-Counter (OTC) Sales flag. 0:NOT_OTC_SALES, 1:OTC_SALES
  createdAt BIGINT NOT NULL,
  updatedAt BIGINT NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE contract ADD INDEX idx_contract_userId(`userId`,`updatedAt`);
ALTER TABLE contract ADD INDEX idx_contract_byUserCpair(`userId`,`base`,`counter`,`updatedAt`);
ALTER TABLE contract ADD INDEX idx_contract_byCpair(`base`,`counter`,`updatedAt`);
ALTER TABLE contract ADD INDEX idx_contract_updatedAt(`updatedAt`);


