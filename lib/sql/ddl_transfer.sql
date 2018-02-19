-- Transfers' history
CREATE TABLE IF NOT EXISTS `transfer` (
  id BIGINT NOT NULL AUTO_INCREMENT,
  srcUserId INT NOT NULL, -- Source user
  dstUserId INT NOT NULL, -- Destination user
  base CHAR(3) NOT NULL, -- a currency name an user hold
  qty BIGINT NOT NULL, -- transfered quantity. eg: 1234567890.000000
  feeUserId INT, -- an user who takes a fee
  feeAmount INT, -- fee amount
  memoType VARCHAR(32), -- memo type (MIME Type etc. eg. "application/json")
  memo VARCHAR(256), -- memo
  createdAt BIGINT NOT NULL,
  updatedAt BIGINT NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE transfer ADD INDEX idx_transfer_srcUserId(`srcUserId`,`updatedAt`);
ALTER TABLE transfer ADD INDEX idx_transfer_dstUserId(`dstUserId`,`updatedAt`);
ALTER TABLE transfer ADD INDEX idx_transfer_srcUserId_base(`srcUserId`,`base`,`updatedAt`);
ALTER TABLE transfer ADD INDEX idx_transfer_dstUserId_base(`dstUserId`,`base`,`updatedAt`);
ALTER TABLE transfer ADD INDEX idx_transfer_userId(`srcUserId`,`dstUserId`,`updatedAt`);
ALTER TABLE transfer ADD INDEX idx_transfer_userId_base(`srcUserId`,`dstUserId`,`base`,`updatedAt`);
