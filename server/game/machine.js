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

const clearNominees = assign({
  nominees: () => [],
});

const nextLeader = assign({
  leader_i: ({leader_i, players: {length}}) => (leader_i + 1) % length,
});

const incRejections = assign({
  rejections: ({rejections}) => rejections + 1,
});

const storeCurrentVotes = assign({
  votes: (_, {votes}) => votes,
});

const clearVotes = assign({
  votes: () => [],
});

const initContext = assign({
  players: initPlayers,
  leader_i: initLeaderIdx,
  nominees: [],
  quests: initQuests,
  quest_i: 0,
  rejections: 0,
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
      rejections: null,
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
          VOTE: {
            target: "tallyVotes",
            cond: "validVoting",
          },
        },
      },

      tallyVotes: {
        entry: logEvent("tallyVotes"),
        always: [
          {target: "questing", cond: "teamIsApproved"},
          {target: "rejected"},
        ],
      },

      questing: {
        entry: logEvent("questing"),
        type: "final",
        // on: {
        //   SUCCESS: "checkSuccessEOG",
        //   FAILURE: "checkFailEOG",
        // },
      },

      rejected: {
        entry: [logEvent("rejected team"), incRejections],
        always: [
          {target: "evilWins", cond: "overRejectionsLimit"},
          {target: "propose", actions: [nextLeader, clearNominees]},
        ],
      },

      checkSuccessEOG: {
        entry: logEvent("check quest success end of game"),
        on: {
          TRIGGER: "assassinate",
          NEXT: "propose",
        },
      },

      checkFailEOG: {
        entry: logEvent("check quest fail end of game"),
        on: {
          TRIGGER: "evilWins",
          NEXT: "propose",
        },
      },

      assassinate: {
        entry: logEvent("assassinate"),
        on: {
          hit: "evilWins",
          miss: "goodWins",
        },
      },

      evilWins: {
        entry: logEvent("evil wins"),
        type: "final",
      },

      goodWins: {
        entry: logEvent("good wins"),
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

      validVoting: ({players: {length}}, {votes}) => {
        if (!Array.isArray(votes)) return false;

        if (votes.length !== length) return false;

        return votes.every((v) => typeof v === "boolean");
      },

      teamIsApproved: (
        {players: {length}},
        _,
        // guards on transient transitions do not maintain original event
        // https://github.com/davidkpiano/xstate/issues/890
        // it is otherwise retrievable from the (meta).state.event
        {
          state: {
            event: {votes},
          },
        },
      ) => votes.filter(Boolean).length * 2 > length,

      overRejectionsLimit: ({rejections}) => rejections >= 5,
    },
  },
);

module.exports = interpret(gameMachine);
