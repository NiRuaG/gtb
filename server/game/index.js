const {canStart} = require("./config");
const gameService = require("./machine");
const shuffle = require("./../../client/src/common/shuffle");
const {interpret} = require("xstate");

const log = (msg, ...rest) => console.log(`Game Server > ${msg}`, ...rest);

const knowsOfEvil = ({character}) =>
  character.side === "evil" || character.title === "Merlin";

const AN_EVIL_CHARACTER_PLAYER = {
  character: {side: "evil"},
};

class GameServer {
  constructor(server) {
    log("constructing game with server", server);
    this.server = server;
    this.service = gameService;
    // this.publicKnowledge = {};
    // this.privateKnowledge = [];

    this.service.onTransition(({value, changed}) => {
      log("onTransition > ", "value:", value, ", changed:", changed);
      this.lastStateChanged = changed;
      this.currentState = value;
      log("emitting state as", value);
      server.emit("gameState", value);
    });

    // Context change listener
    this.service.onChange((newContext, prevContext) => {
      log(
        "onChange > ",
        "new context",
        newContext,
        "prev. context",
        prevContext,
      );

      const {players, quests, currentQuest_i, leader_i} = newContext;
      //? this only needs to be done once
      // possibly its own emit specific to characters
      const evilPlayers = players.reduce(
        (evils, {character}, index) =>
          character.side === "evil"
            ? {
                ...evils,
                [this.usersByPlayerIdx.get(index).id]: AN_EVIL_CHARACTER_PLAYER,
              }
            : evils,
        {},
      );

      players.forEach((player, idx) => {
        const user = this.usersByPlayerIdx.get(idx);

        user.connection.emit(
          "players",
          {
            ...(knowsOfEvil(player) ? evilPlayers : {}),
            [user.id]: player,
          },
          leader_i,
        );
      });

      server.emit("quests", quests, currentQuest_i);
    });

    this.service.start();
  }

  hasStarted() {
    return this.service.state.value != "idle";
  }

  canStart = canStart;

  start(users) {
    log("starting game server with users", {users});
    this.playerIdxByUserId = new Map(users.map(({id}, idx) => [id, idx]));
    this.usersByPlayerIdx = new Map(users.map((user, idx) => [idx, user]));

    this.service.send("START", {players: {length: users.length}});
    if (this.lastStateChanged) {
      return false;
    }

    // TODO: incoming msg handlers
    // users.forEach(user => {
    // user.connection.on("");
    // })

    //? this.service.onDone(() => return true);

    // this.publicKnowledge.quests = config.quests;
    // this.assignCharacters(config);
    // this.assignRandomLeader();
    // this.assignKnowledge();
  }

  assignRandomLeader() {
    const {players, publicKnowledge} = this;
    const randomIdx = Math.floor(Math.random() * players.length);
    players.forEach((p) => (p.isLeader = i === randomIdx));
  }
}

module.exports = GameServer;
