const {Machine, interpret, assign} = require("xstate");
const {MIN_PLAYERS, MAX_PLAYERS} = require("../../client/src/common/constants");
const shuffle = require("../../client/src/common/shuffle");

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

const configFor = (length) => {
  const config = CONFIG[length];
  if (!config) return;

  return {
    ...config,
    good: length - config.evil,
  };
};

const knowsOfEvil = ({character}) =>
  character.side === "evil" || character.title === "Merlin";

const log = (msg) => (context, event) => {
  console.log(msg, {context, event});
};

const initPlayers = (_, {players}) => players;
const initQuests = (_, {players: {length}}) => {
  const {quests} = CONFIG[length];
};

const initContext = assign({
  players: initPlayers,
  leader_i: 0,
  nominees: [],
  quests: (_, {players: {length}}) => [],
  currentQuest_i: 0,
  votes: [],
});

const gameMachine = Machine({
  id: "game",

  context: {
    players: [],
    leader_i: null,
    nominees: [],
    quests: [],
    currentQuest_i: null,
    votes: [],
  },

  initial: "idle",

  states: {
    idle: {
      on: {
        START: {
          target: "propose",
          actions: initContext,
        },
      },
      // exit: log("exit from idle"),
    },

    propose: {
      entry: log("entered propose"),
      on: {
        NOMINATE: "castVotes",
      },
    },

    castVotes: {
      on: {
        APPROVE: "embark",
        REJECT: "checkRejEOG",
      },
    },

    checkRejEOG: {
      on: {
        TRIGGER: "evilWins",
        NEXT: "propose",
      },
    },

    embark: {
      on: {
        SUCCESS: "checkSuccEOG",
        FAILURE: "checkFailEOG",
      },
    },

    checkSuccEOG: {
      on: {
        TRIGGER: "assassinate",
        NEXT: "propose",
      },
    },

    checkFailEOG: {
      on: {
        TRIGGER: "evilWins",
        NEXT: "propose",
      },
    },

    assassinate: {
      on: {
        hit: "evilWins",
        miss: "goodWins",
      },
    },

    evilWins: {
      type: "final",
    },

    goodWins: {
      type: "final",
    },
  },
});

class Game {
  constructor() {}

  // ? and game hasn't started already?
  isReady({length}) {
    return length >= MIN_PLAYERS && length <= MAX_PLAYERS;
  }

  start(state, {length}) {
    if (state.description !== "waiting to start") return state;

    log("starting with player length", length);
    const players = Array.from({length}, (_) => {
      __this: "is a player object";
    });
    const {quests} = configFor(length);

    return {
      ...state,
      description: "waiting for nominations",
      players,
      quests,
      currentQuest: quests[0],
    };
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

module.exports = interpret(gameMachine);
