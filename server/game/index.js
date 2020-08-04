const {canStart} = require("./config");
const gameService = require("./machine");
const shuffle = require("./../../client/src/common/shuffle");
const {interpret} = require("xstate");

const log = (msg, ...rest) => console.log(`Game\t${msg}`, ...rest);

//! quirky shorthand
// if given teamSize is negative, quest needs 2 failures
// instead of 1 failure default
const Quest = (teamSize) => ({
  teamSize: Math.abs(teamSize),
  failsReq: teamSize < 0 ? 2 : 1,
});

const CONFIG = {
  5: {evil: 2, quests: [2, 3, 2, 3, 3].map(Quest)},
  6: {evil: 2, quests: [2, 3, 4, 3, 4].map(Quest)},
  7: {evil: 3, quests: [2, 3, 3, -4, 4].map(Quest)},
  8: {evil: 3, quests: [3, 4, 4, -5, 5].map(Quest)},
  9: {evil: 3, quests: [3, 4, 4, -5, 5].map(Quest)},
  10: {evil: 4, quests: [3, 4, 4, -5, 5].map(Quest)},
};

const configFor = ({length}) => {
  const config = CONFIG[length];
  if (!config) return;

  return {
    ...config,
    good: length - config.evil,
  };
};

const knowsOfEvil = ({character}) =>
  character.side === "evil" || character.title === "Merlin";

class GameServer {
  constructor() {
    log("constructed");
    this.service = gameService;
    this.publicKnowledge = {};
    this.privateKnowledge = [];

    this.service.onTransition((state) => {
      log("onTrans state", state, state.changed);
      this.lastStateChanged = state.changed;
    });

    this.service.start();
  }

  hasStarted() {
    return this.service.state.value != "idle";
  }

  canStart = canStart;

  start(server, players) {
    log("starting server with", server, "and players", players);

    this.service.send("START", {players});
    if (this.lastStateChanged) {
      return false;
    }

    //? this.service.onDone(() => return true);
    //? this.service.onChange() context changes!?

    // this.players = players_;
    // const {players} = this;

    // const config = configFor(players);

    // this.publicKnowledge.quests = config.quests;
    // this.assignCharacters(config);
    // this.assignRandomLeader();
    // this.assignKnowledge();
  }

  assignCharacters({good, evil}) {
    const characters = [
      ...Array.from({length: good - 1}, (_) => ({
        side: "good",
        description: "Loyal Servant of Arthur",
      })),
      {
        side: "good",
        description: "Knows evil, must remain hidden",
        title: "Merlin",
      },
      ...Array.from({length: evil - 1}, (_) => ({
        side: "evil",
        description: "Minion of Mordred",
      })),
      {
        side: "evil",
        description: "Minion of Mordred",
        title: "Assassin",
      },
    ];

    shuffle(characters);
    this.players.forEach((player, i) => {
      player.character = character[i];
    });
  }

  assignRandomLeader() {
    const {players, publicKnowledge} = this;
    const randomIdx = Math.floor(Math.random() * players.length);
    players.forEach((p) => (p.isLeader = i === randomIdx));
  }

  assignKnowledge() {
    const {players} = this;

    players.forEach((player, i) => {
      const knowledge = players.map(({character, isLeader}, j) => {
        const common = {isLeader};

        if (i === j) {
          return {...common, character};
        }
        if (knowsOfEvil(player)) {
          return {...common, character: {side: character.side}};
        }
        return common;
      });

      player.knowledge = {
        ...this.publicKnowledge,
        ...knowledge,
      };
    });
  }
}

module.exports = GameServer;
