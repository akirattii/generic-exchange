
--
-- Supply 100 USD to all users
--
INSERT INTO `position`(
	userId,
	base,
	qty,
  createdAt,
  updatedAt
) VALUES (
	101,
	"USD",
	100,
	unix_timestamp(),
	unix_timestamp()
);
INSERT INTO `position`(
	userId,
	base,
	qty,
  createdAt,
  updatedAt
) VALUES (
	102,
	"USD",
	100,
	unix_timestamp(),
	unix_timestamp()
);
INSERT INTO `position`(
	userId,
	base,
	qty,
  createdAt,
  updatedAt
) VALUES (
	103,
	"USD",
	100,
	unix_timestamp(),
	unix_timestamp()
);
INSERT INTO `position`(
	userId,
	base,
	qty,
  createdAt,
  updatedAt
) VALUES (
	104,
	"USD",
	100,
	unix_timestamp(),
	unix_timestamp()
);

--
-- Supply 10000 JPY to all users
--
INSERT INTO `position`(
	userId,
	base,
	qty,
  createdAt,
  updatedAt
) VALUES (
	101,
	"JPY",
	10000,
	unix_timestamp(),
	unix_timestamp()
);
INSERT INTO `position`(
	userId,
	base,
	qty,
  createdAt,
  updatedAt
) VALUES (
	102,
	"JPY",
	10000,
	unix_timestamp(),
	unix_timestamp()
);
INSERT INTO `position`(
	userId,
	base,
	qty,
  createdAt,
  updatedAt
) VALUES (
	103,
	"JPY",
	10000,
	unix_timestamp(),
	unix_timestamp()
);
INSERT INTO `position`(
	userId,
	base,
	qty,
  createdAt,
  updatedAt
) VALUES (
	104,
	"JPY",
	10000,
	unix_timestamp(),
	unix_timestamp()
);


-- USD/JPY offers
INSERT INTO offer(
	userId,
	base,
	counter,
	buysell,
	price,
	qty,
	remaining,
  createdAt,
  updatedAt
) VALUES (
	101,
	"USD",
	"JPY",
	1, -- buy
	100, -- @100
	100, -- qty:100
	100, -- remaining:100
	unix_timestamp(),
	unix_timestamp()
);
INSERT INTO offer(
	userId,
	base,
	counter,
	buysell,
	price,
	qty,
	remaining,
  createdAt,
  updatedAt
) VALUES (
	102,
	"USD",
	"JPY",
	1, -- buy
	101, -- @101
	100, -- qty:100
	100, -- remaining:100
	unix_timestamp(),
	unix_timestamp()
);
INSERT INTO offer(
	userId,
	base,
	counter,
	buysell,
	price,
	qty,
	remaining,
  createdAt,
  updatedAt
) VALUES (
	103,
	"USD",
	"JPY",
	-1, -- buy
	102, -- @101
	100, -- qty:100
	100, -- remaining:100
	unix_timestamp(),
	unix_timestamp()
);