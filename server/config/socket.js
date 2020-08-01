const Game = require("./../game");

const sanitizedName = require("./../../client/src/common/sanitizedName");
// const {MAX_PLAYERS} = require("./../../client/src/common/constants");

// const game = new Game();

const users = [];
const userNames = new Set();
const privilegedUsers = new Set();

module.exports = (server) => {
  // const emitReady = () => {
  //   server.emit("ready", game.isReady(users));
  // };

  const emitUsers = () => {
    const usersEmission = users.map((user, idx) => ({
      name: user.name,
      privileged: privilegedUsers.has(user),
    }));

    users.forEach(({connection}, index) => {
      connection.emit("users", usersEmission, index);
    });
  };

  const emitGame = () => {
    console.log(game.publicKnowledge);
    server.emit("public", game.publicKnowledge);
    //? probably also include emitUsers with their characters
  };

  server.on("connection", (clientSocket) => {
    console.log("connection", clientSocket.id);

    // TODO: spectators?
    //? TODO: check if game.full()
    // if (players.length >= MAX_PLAYERS) {
    // console.log("no more room");
    // client.disconnect(true);
    // return;
    // }

    let thisUser = {
      connection: clientSocket,
    };
    users.push(thisUser);

    thisUser.connection.emit("connected", true);
    emitUsers();
    // emitReady();

    //* Handlers
    clientSocket.on("disconnect", () => {
      console.log("disconnect!", clientSocket.id);

      const idx = users.findIndex(
        ({connection}) => connection === clientSocket,
      );
      if (idx >= 0) users.splice(idx, 1);

      emitUsers();
      // emitReady();

      if (thisUser == null) return;
      if (thisUser.name != null) {
        userNames.delete(thisUser.name.toLowerCase());
      }
      thisUser = null;
    });

    //! not sure under what conditions this fires
    clientSocket.on("reconnect", () => {
      console.log("reconnect!?");
    });

    // incoming messages
    clientSocket.on("name", (name) => {
      if (thisUser == null) return;

      name = sanitizedName(name);
      if (!name) {
        //TODO: emit error or something // blank name
        return;
      }

      const nameLC = name.toLowerCase();
      if (userNames.has(nameLC)) {
        //TODO: clientSocket.emit("errorOrSomeSort") // name already taken
        return;
      }
      userNames.add(nameLC);

      thisUser.name = name;
      emitUsers();
    });

    clientSocket.on("start", () => {
      const privilegedUser = users[0];
      if (thisUser !== privilegedUser) {
        console.log("! unprivileged player trying to start game");
        return emitUsers();
      }

      console.log("privileged player starting game");

      // if (!game.isReady(users)) {
      //   console.log("but game not ready");
      //   return emitReady();
      // }

      game.start(users.map(({player}) => player));
      return emitGame();
    });
  });
};
