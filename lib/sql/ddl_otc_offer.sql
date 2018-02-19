-- OTC Sales Orders (completely same structure as `offer` table)
CREATE TABLE IF NOT EXISTS `otc_offer` (
  id INT NOT NULL AUTO_INCREMENT,
  userId INT NOT NULL, -- generally it's OTC Sales provider admin's userId
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
ALTER TABLE otc_offer ADD INDEX idx_otc_offer_userId(`userId`);
ALTER TABLE otc_offer ADD INDEX idx_otc_offer_userOffers(`userId`,`base`,`counter`,`updatedAt`);
ALTER TABLE otc_offer ADD INDEX idx_otc_offer_orderbook(`base`,`counter`,`price`,`remaining`,`cancelled`,`updatedAt`);
ALTER TABLE otc_offer ADD INDEX idx_otc_offer_matchingOffer(`base`,`counter`,`price`,`buysell`,`remaining`,`cancelled`,`updatedAt`);
-- otc_offer's original index:
ALTER TABLE otc_offer ADD UNIQUE idx_otc_offer_userCpairBuysell(`userId`,`base`,`counter`,`buysell`);
ALTER TABLE otc_offer ADD INDEX idx_otc_offer_userCpair(`userId`,`base`,`counter`);

