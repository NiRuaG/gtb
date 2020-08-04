const GameServer = require("./../game");
const sanitizedName = require("./../../client/src/common/sanitizedName");

const usersByID = new Map();
const userNames = new Set();
const privilegedUserIDs = new Set();
const permittedUserIDs = new Set();

const emitUsers = () => {
  const usersEmission = [...usersByID.values()].map(({id, name}) => ({
    id,
    name,
    privileged: privilegedUserIDs.has(id),
    permitted: permittedUserIDs.has(id),
  }));

  usersByID.forEach(({connection}, id) => {
    connection.emit("users", usersEmission, id);
  });
};

const gameServer = new GameServer();
const checkIfGameReady = () => gameServer.canStart(permittedUserIDs);

module.exports = (server) => {
  const emitReady = () => {
    server.emit("ready", checkIfGameReady());
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

    usersByID.set(clientSocket.id, {
      id: clientSocket.id,
      connection: clientSocket,
    });

    clientSocket.emit("connected", true);
    emitUsers();

    //* Handlers
    clientSocket.on("disconnect", () => {
      console.log("disconnect!", clientSocket.id);

      // cleanup
      const {id} = clientSocket;

      if (!usersByID.has(id)) return;
      const {name} = usersByID.get(id);

      // cleanup usersByID
      usersByID.delete(id);
      permittedUserIDs.delete(id);
      // cleanup privileges
      privilegedUserIDs.delete(id);
      // TODO: hide impl detail
      if (privilegedUserIDs.size === 0) {
        const firstNamedUser = [...usersByID.values()].find(({name}) =>
          Boolean(name),
        );
        if (firstNamedUser != null) {
          privilegedUserIDs.add(firstNamedUser.id);
        }
      }

      // cleanup names
      if (name != null) {
        userNames.delete(name.toLowerCase());
      }

      emitUsers();
      emitReady();
    });

    //! not sure under what conditions this fires
    clientSocket.on("reconnect", () => {
      console.log("reconnect!?");
    });

    // incoming messages
    clientSocket.on("name", (name) => {
      name = sanitizedName(name);

      if (!name) {
        //TODO: emit error, nack, or something // blank name
        return;
      }

      const nameLC = name.toLowerCase();
      if (userNames.has(nameLC)) {
        //TODO: error, nack, something // name already taken
        return;
      }
      userNames.add(nameLC);

      const prevName = usersByID.get(clientSocket.id).name;
      if (prevName == undefined) {
        permittedUserIDs.add(clientSocket.id);
      }
      usersByID.get(clientSocket.id).name = name;

      // extract to something like updatePrivileges(),
      // to hide this implementation detail
      //? or have it triggered when emitting users?
      if (userNames.size === 1) {
        privilegedUserIDs.add(clientSocket.id);
      }

      emitUsers();
      emitReady(); // tie this fn with any change to permittedUsers
    });

    clientSocket.on("permit", (idToPermit, toBePermitted) => {
      (() => {
        if (!privilegedUserIDs.has(clientSocket.id)) {
          console.log("! unprivileged user trying to permit user");
          return;
        }

        console.log("privileged user setting permit for other user", {
          idToPermit,
          toBePermitted,
        });

        if (usersByID.get(idToPermit) == null) {
          console.log("user with idToPermit not found");
          return;
        }

        if (!toBePermitted) {
          //TODO: reconsider this flow - maybe the (current impl. is one and only)
          // privileged user doesn't want to play,
          // but at this point no plan for spectating
          //? special case if it's thisUser?
          if (privilegedUserIDs.has(idToPermit)) {
            console.log("! trying to prevent another privileged user");
            return;
          }
          permittedUserIDs.delete(idToPermit);
        } else {
          permittedUserIDs.add(idToPermit);
        }
      })();

      emitUsers();
      emitReady();
    });

    clientSocket.on("start", () => {
      if (!privilegedUserIDs.has(clientSocket.id)) {
        console.log("! unprivileged user trying to start game");
        return emitUsers();
      }

      console.log("privileged user starting game");

      if (!checkIfGameReady()) {
        console.log("but game not ready");
        return emitReady();
      }

      const didStart = gameServer.start(
        server,
        [...permittedUserIDs].map((id) => usersByID.get(id)),
      );

      if (!didStart) {
        emitUsers();
        emitReady();
      }
    });
  });
};
