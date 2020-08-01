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

const io = require("socket.io")(server);
require("./config/socket")(io.of("/"));

app.get("*", (req, res) => {
  res.sendFile(require("path").join(__dirname, "./client/build/index.html"));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`App listening on http://localhost:${PORT} !`);
});

// {
//   "name": "mern",
//   "version": "1.0.0",
//   "description": "Mern Demo",
//   "main": "server.js",
//   "scripts": {
//     "start": "if-env NODE_ENV=production && npm run start:prod || npm run start:dev",
//     "start:prod": "node server.js",
//     "start:dev": "concurrently \"nodemon --ignore client/\" \"npm run client\"",
//     "client": "cd client && npm run start",
//     "installx": "cd client && npm install",
//     "build": "cd client && npm run build",
//     "heroku-postbuild": "npm run build"
//   },
//   "author": "",
//   "license": "ISC",
//   "devDependencies": {
//     "concurrently": "^4.1.0",
//     "nodemon": "^1.18.7"
//   },
//   "dependencies": {
//     "axios": "^0.18.1",
//     "dotenv": "^6.2.0",
//     "express": "^4.17.1",
//     "helmet": "^3.15.1",
//     "if-env": "^1.0.4",
//     "morgan": "^1.9.1",
//     "socket.io": "^2.2.0"
//   }
// }
