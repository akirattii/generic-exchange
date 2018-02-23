module.exports = function(err, req, res, next) {
  if (err) {
    logger.error("!!!!! errorHandler middleware caught error:", err, err.stack);
    logger.error("reset gex.isTxBusy to false");
    gex.isTxBusy = false;
  }
  res.writeHead(500, {});
  res.write("Internal Server Error");
  res.end();
};