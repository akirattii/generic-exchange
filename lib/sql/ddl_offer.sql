-- Orders
CREATE TABLE IF NOT EXISTS `offer` (
  id BIGINT NOT NULL AUTO_INCREMENT,
  userId INT NOT NULL,
  base CHAR(3) NOT NULL,
  counter CHAR(3) NOT NULL,
  buysell TINYINT NOT NULL DEFAULT 1, -- -1:sell 1:buy
  price DECIMAL(10,2) NOT NULL,
  qty BIGINT NOT NULL,
  remaining BIGINT NOT NULL,
  cancelled TINYINT NOT NULL DEFAULT 0, -- 0:NO, 1:Cancelled
  createdAt BIGINT NOT NULL,
  updatedAt BIGINT NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE offer ADD INDEX idx_offer_userId(`userId`);
ALTER TABLE offer ADD INDEX idx_offer_userOffers(`userId`,`base`,`counter`,`updatedAt`);
ALTER TABLE offer ADD INDEX idx_offer_orderbook(`base`,`counter`,`price`,`remaining`,`cancelled`,`updatedAt`);
ALTER TABLE offer ADD INDEX idx_offer_matchingOffer(`base`,`counter`,`price`,`buysell`,`remaining`,`cancelled`,`updatedAt`);
