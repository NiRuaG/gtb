const sanitizedName = require("./../../../client/src/common/sanitizedName");

const usersByID = new Map();
const userNames = new Set();
const privilegedUserIDs = new Set();
const permittedUserIDs = new Set();

const emitUsers = () => {
  const usersEmission = [...usersByID.entries()].map(([id, {name}]) => ({
    id,
    name,
    privileged: privilegedUserIDs.has(id),
    permitted: permittedUserIDs.has(id),
  }));

  usersByID.forEach(({connection}, id) => {
    connection.emit("users", usersEmission, id);
  });
};

const checkAutoPriv = () => {
  const {size} = privilegedUserIDs;
  console.log(`Checking to auto-assign to privileged users (${size}):`);

  if (size > 0) {
    console.log("..there are already privileged users\n:aborting");
    return;
  }

  console.log("..no existing privileged users");

  console.log(`..users with names (${userNames.size})`);
  if (userNames.size === 0) {
    console.log("..no users with names\n:aborting");
    return;
  }

  const aNamedUserEntry = [...usersByID.entries()].find(
    ([id, {name}]) => name != null,
  );
  console.log(
    "..finding first user with name:",
    aNamedUserEntry ? "found" : "not found",
  );

  if (aNamedUserEntry == null) {
    console.log(":aborting");
    return;
  }

  const id = aNamedUserEntry[0];
  console.log("..adding to privileged set, id", id);
  privilegedUserIDs.add(id);

  console.log(":done");
};

module.exports = (server, GameServer) => {
  const useServerEffect = (fnReturningCleanup) => {
    if (typeof fnReturningCleanup != "function") {
      console.log("ERR: bad arguments for useServerEffect", {
        fnReturningCleanup,
      });
      return;
    }

    server.on("connect", (socket) => {
      const cleanup = fnReturningCleanup(socket);

      socket.on("disconnect", cleanup);
    });
  };

  useServerEffect(require("./logging"));

  let gameServer = new GameServer(server);
  const checkIfGameReady = () => gameServer.canStart(permittedUserIDs);

  const emitReady = () => {
    server.emit("ready", checkIfGameReady());
  };

  // TODO: spectators?
  //? TODO: check if game.full()
  // if (players.length >= MAX_PLAYERS) {
  // console.log("no more room");
  // client.disconnect(true);
  // return;
  // }

  useServerEffect((clientSocket) => {
    console.log("Adding to users map, key", clientSocket.id);
    usersByID.set(clientSocket.id, {
      id: clientSocket.id,
      connection: clientSocket,
    });

    return (...args) => {
      console.log("Removing from users map, key", clientSocket.id, {
        args,
      });
      console.log("Found for deletion", usersByID.delete(clientSocket.id));
    };
  });

  useServerEffect((clientSocket) => {
    let nameToCleanup;

    clientSocket.on("name", (name, ...args) => {
      console.log(
        "Received 'name' event",
        {name, args},
        "from id",
        clientSocket.id,
        ":",
      );
      //registerName
      (() => {
        name = sanitizedName(name);

        if (!name) {
          console.log("..name is empty\n:aborting");
          //TODO: error, nack, something // blank name
          return;
        }

        const nameLC = name.toLowerCase();
        if (userNames.has(nameLC)) {
          console.log("..name is already taken\n:aborting");
          //TODO: error, nack, something // name already taken
          return;
        }

        console.log("..adding name to set");
        userNames.add(nameLC);
        nameToCleanup = nameLC;

        const prevName = usersByID.get(clientSocket.id).name;
        if (prevName) {
          console.log(
            "..user had previous name",
            prevName,
            "removing from set",
          );
          userNames.delete(prevName);
        } else {
          console.log("..user had no previous name,");
          //! could be better
          console.log("..automatically adding user to permitted set");
          permittedUserIDs.add(clientSocket.id);
        }

        //! could be better?
        console.log("..setting name property on user, id", clientSocket.id);
        usersByID.get(clientSocket.id).name = name;
      })();
      console.log(":done");

      //! could be better
      checkAutoPriv();

      emitUsers(); // tie this fn with any change to permittedUsers
      emitReady();
    });

    return () => {
      //unregisterName
      console.log("Removing from names set,", nameToCleanup);
      console.log("? Found for deletion", userNames.delete(nameToCleanup));
    };
  });

  useServerEffect((clientSocket) => {
    clientSocket.on("permit", (idToPermit, toBePermitted, ...args) => {
      console.log(
        "Received 'permit' event",
        {idToPermit, toBePermitted, args},
        "from id",
        clientSocket.id,
        ":",
      );

      (() => {
        if (!privilegedUserIDs.has(clientSocket.id)) {
          console.log("..! user is unprivileged\n:aborting");
          return;
        }

        if (gameServer.hasStarted()) {
          console.log("..game has started\n:aborting");
          return;
        }

        if (usersByID.get(idToPermit) == null) {
          console.log(`user with that id (${idToPermit}) not found\n:aborting`);
          return;
        }

        if (!toBePermitted) {
          //TODO: reconsider this flow - maybe the (current impl. as one and only)
          // privileged user doesn't want to play.
          // however at this point no plan for spectating
          //? special case if it's thisUser?
          if (privilegedUserIDs.has(idToPermit)) {
            console.log(
              "..! trying to remove permit from other privileged user\n:aborting",
            );
            return;
          }
          console.log("..removing from permitted set, id", idToPermit);
          console.log(
            "? found for deletion",
            permittedUserIDs.delete(idToPermit),
          );
          console.log(":done");
          return;
        }

        console.log("..adding to permitted set, id", idToPermit);
        console.log(`..size ${permittedUserIDs.add(idToPermit).size}`);
        console.log(":done");
      })();

      emitUsers();
      emitReady();
    });

    return (...args) => {
      console.log("Removing from permitted set, id", clientSocket.id);
      console.log(
        "? found for deletion",
        permittedUserIDs.delete(clientSocket.id),
      );
    };
  });

  server.on("connection", (clientSocket) => {
    //! v dev only v
    {
      const name = clientSocket.id.slice(0, 4).toLowerCase();
      userNames.add(name);
      permittedUserIDs.add(clientSocket.id);
      usersByID.get(clientSocket.id).name = name;

      if (userNames.size === 1) {
        privilegedUserIDs.add(clientSocket.id);
      }

      emitUsers();
      emitReady(); // tie this fn with any change to permittedUsers
    }
    //! ^ dev only ^

    clientSocket.emit("connected", true); // ack
    emitUsers();

    //* Handlers
    clientSocket.on("disconnect", () => {
      //! for dev, needs fix
      if (gameServer.hasStarted()) {
        gameServer.service.stop();
        gameServer = new GameServer(server);
        //! after dev, make gameServer const
      }

      // cleanup privileges
      console.log("Removing from privileged set, id", clientSocket.id);
      console.log(
        "? Found for deletion",
        privilegedUserIDs.delete(clientSocket.id),
      );

      //! could be better ?
      checkAutoPriv();

      emitUsers();
      emitReady();
    });

    //! not sure under what conditions this fires
    clientSocket.on("reconnect", (...args) => {
      console.log("Reconnect!?", clientSocket, ...args);
    });

    clientSocket.on("start", () => {
      if (!privilegedUserIDs.has(clientSocket.id)) {
        console.log("! unprivileged user trying to start game");
        return emitUsers();
      }

      console.log("privileged user starting game");

      if (!checkIfGameReady()) {
        console.log("but game not ready, aborting");
        return emitReady();
      }

      if (gameServer.hasStarted()) {
        console.log("but game already started, aborting");
        return server.emit("gameState", gameServer.currentState);
      }

      const didStart = gameServer.start(
        [...permittedUserIDs].map((id) => usersByID.get(id)),
      );

      if (!didStart) {
        emitUsers();
        emitReady();
        return;
      }

      console.log("successful start");
      console.log("disconnecting non-permitted users:");
      usersByID.forEach(({connection}, id) => {
        if (!permittedUserIDs.has(id)) {
          console.log("\t", id);
          connection.disconnect(true);
        }
      });
      emitUsers();
    });
  });
};
