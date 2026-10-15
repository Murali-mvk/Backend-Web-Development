function sendList(res, rows, meta) {
  return res.status(200).json({
    success: true,
    data: rows,
    meta
  });
}

function sendCreated(res, post) {
  return res.status(201).json({
    success: true,
    data: post
  });
}

function sendOk(res, payload) {
  return res.status(200).json({
    success: true,
    data: payload
  });
}

function sendError(res, status, message) {
  return res.status(status).json({
    success: false,
    error: { message }
  });
}

module.exports = {
  sendList,
  sendCreated,
  sendOk,
  sendError
};
