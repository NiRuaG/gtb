const {Machine, interpret, assign} = require("xstate");
const {canStart} = require("./config");
const shuffle = require("../../client/src/common/shuffle");

//! quirky shorthand
// if given teamSize is negative, quest needs 2 failures
// instead of default 1 failure
const Quest = (teamSize) => ({
  teamSize: Math.abs(teamSize),
  failsReq: teamSize < 0 ? 2 : 1,
});

const CONFIG = {
  5: {good: 3, evil: 2, quests: [2, 3, 2, 3, 3].map(Quest)},
  6: {good: 4, evil: 2, quests: [2, 3, 4, 3, 4].map(Quest)},
  7: {good: 4, evil: 3, quests: [2, 3, 3, -4, 4].map(Quest)},
  8: {good: 5, evil: 3, quests: [3, 4, 4, -5, 5].map(Quest)},
  9: {good: 6, evil: 3, quests: [3, 4, 4, -5, 5].map(Quest)},
  10: {good: 6, evil: 4, quests: [3, 4, 4, -5, 5].map(Quest)},
};

const knowsOfEvil = ({character}) =>
  character.side === "evil" || character.title === "Merlin";

const logEvent = (msg) => (context, event) => {
  console.log(msg, {context, event});
};

const initPlayers = (_, {players: {length}}) => {
  const {good, evil} = CONFIG[length];

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
  return characters.map((character) => ({
    character,
  }));
};

const initQuests = (_, {players: {length}}) => CONFIG[length].quests;
const initLeaderIdx = (_, {players: {length}}) =>
  Math.floor(Math.random() * length);

const setNominees = assign({
  nominees: (_, {nominees}) => nominees,
});

const initContext = assign({
  players: initPlayers,
  leader_i: initLeaderIdx,
  nominees: [],
  quests: initQuests,
  quest_i: 0,
  votes: [],
  vote_i: 0,
});

const gameMachine = Machine(
  {
    id: "game",

    context: {
      players: [],
      leader_i: null,
      nominees: [],
      quests: null,
      quest_i: null,
      votes: [],
      vote_i: null,
    },

    initial: "idle",

    states: {
      idle: {
        on: {
          START: {
            target: "propose",
            actions: initContext,
            cond: "canStart",
          },
        },
        // exit: log("exit from idle"),
      },

      propose: {
        // entry: log("entered propose"),
        on: {
          NOMINATE: {
            target: "castVotes",
            actions: setNominees,
            cond: "canPropose",
          },
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
          SUCCESS: "checkSuccessEOG",
          FAILURE: "checkFailEOG",
        },
      },

      checkSuccessEOG: {
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
  },

  {
    guards: {
      canStart: (_, {players}) => players != null && canStart(players),
      canPropose: (
        {quests, quest_i, leader_i, players: {length}},
        {sourcePlayerIdx, nominees},
      ) => {
        if (!Array.isArray(nominees) || sourcePlayerIdx == null) return false;

        const proposedByLeader = sourcePlayerIdx === leader_i;
        const correctTeamSize = nominees.length === quests[quest_i].teamSize;
        const validTeamIndices = nominees.every(
          (idx) => idx >= 0 && idx < length,
        );

        return proposedByLeader && correctTeamSize && validTeamIndices;
      },
    },
  },
);

module.exports = interpret(gameMachine);
