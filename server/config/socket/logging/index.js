module.exports = (clientSocket) => {
  require("./logConnection")(clientSocket);

  return (...args) => {
    console.log("Disconnect:", clientSocket.id, {args});
  };
};
