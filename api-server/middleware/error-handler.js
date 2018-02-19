module.exports = function(err, req, res, next) {
  if (err) logger.error("!!!!! errorHandler middleware caught error:", err.stack);
  res.writeHead(500, {});
  res.write("Internal Server Error");
  res.end();
};