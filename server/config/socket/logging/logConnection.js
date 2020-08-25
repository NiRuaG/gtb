module.exports = (clientSocket) => {
  if (clientSocket == null) {
    console.log("ERR: null clientSocket while trying to logConnection");
    return;
  }

  let {
    // unused
    adapter,
    client,
    conn,
    nsp,
    _rooms,
    server,
    // used
    id,
    acks,
    connected,
    disconnected,
    flags,
    fns,
    handshake,
    rooms,
    ...rest
  } = clientSocket;

  let {
    // unused
    issued,
    query,
    secure,
    url,
    xdomain,
    // used
    address,
    headers,
    time,
    ...restHandshake
  } = handshake || {};

  let {
    // unused
    accept,
    "accept-encoding": acceptEncoding,
    "accept-language": acceptLanguage,
    connection,
    // used
    cookie,
    host,
    referer,
    "user-agent": userAgent,
    ...restHeaders
  } = headers || {};

  headers = {
    cookie,
    host,
    referer,
    "user-agent": userAgent,
    ...restHeaders,
  };

  handshake = {
    address,
    headers,
    time,
    ...restHandshake,
  };

  console.log("Connection:", {
    id,
    acks,
    connected,
    disconnected,
    flags,
    fns,
    handshake,
    rooms,
    ...rest,
  });
};
