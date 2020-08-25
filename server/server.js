// require("dotenv").config();

const express = require("express");
const app = express();
const server = require("http").Server(app);

app.use(
  require("morgan")("dev"),

  express.urlencoded({extended: true}),
  express.json(),

  require("helmet")(),
  // require("cookie-session")({
  //   name: "styxsess",
  //   secret: process.env.SESSION_SECRET,
  //   maxAge: 1000 * 60 * 60 * 24, // 1day
  //   httpOnly: true,
  //   // secure: true, //! cant, requires https?
  // }),
);

// Serve up static assets (usually on heroku)
if (process.env.NODE_ENV === "production") {
  app.use(express.static("client/build"));
}

const io = require("socket.io")(server, {
  perMessageDeflate: false,
  maxHttpBufferSize: 1e5,
});
require("./config/socket")(io.of("/"), require("./game"));

app.get("*", (req, res) => {
  res.sendFile(require("path").join(__dirname, "./client/build/index.html"));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`App listening on http://localhost:${PORT} !`);
});
