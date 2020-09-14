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

const initQuests = (_, {players: {length}}) =>
  CONFIG[length].quests.map((q) => ({...q}));
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

const nextQuest = assign({
  quest_i: ({quest_i}) => quest_i + 1,
});

const incRejections = assign({
  rejections: ({rejections}) => rejections + 1,
});

const addDecision = assign({
  decisions: ({decisions}, {sourcePlayerIdx: i, decision}) => (
    (decisions[i] = decision), decisions
  ),
});

const clearDecisions = assign({
  decisions: () => [],
});

const resetRejections = assign({
  rejections: 0,
});

const assignCurrentQuestSideOf = (side) =>
  assign({
    quests: ({quests, quest_i}) => ((quests[quest_i].side = side), quests),
  });
const failQuest = assignCurrentQuestSideOf("evil");
const succeedQuest = assignCurrentQuestSideOf("good");

const initContext = assign({
  players: initPlayers,
  leader_i: initLeaderIdx,
  nominees: [],
  quests: initQuests,
  quest_i: 0,
  rejections: 0,
  decisions: [],
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
      decisions: [],
    },

    initial: "idle",

    states: {
      idle: {
        entry: logEvent("idle"),
        on: {
          START: {
            target: "propose",
            cond: "canStart",
          },
        },
        exit: [initContext],
      },

      propose: {
        entry: [logEvent("propose"), nextLeader, clearNominees],
        on: {
          NOMINATE: {
            target: "castVotes",
            actions: setNominees,
            cond: "canPropose",
          },
        },
      },

      castVotes: {
        entry: logEvent("castVotes"),
        on: {
          VOTE: {
            target: "tallyVotes",
            cond: "votesAreValid",
          },
        },
      },

      tallyVotes: {
        entry: logEvent("tallyVotes"),
        always: [
          {target: "rejected", cond: "teamIsRejected"},
          {target: "questing"},
        ],
      },

      rejected: {
        entry: [logEvent("rejected team"), incRejections],
        always: [
          {target: "evilWinsByRejections", cond: "overRejectionsLimit"},
          {target: "propose"},
        ],
      },

      questing: {
        entry: [logEvent("questing"), clearDecisions],
        always: [{target: "tallyDecisions", cond: "allDecisionsReceived"}],
        on: {
          DECIDE: {
            actions: addDecision,
            cond: "canDecide",
            internal: false,
          },
        },
      },

      tallyDecisions: {
        entry: logEvent("tallyDecisions"),
        always: [
          {
            cond: "questFailed",
            actions: [failQuest],
            target: "checkFailureEOG",
          },
          {
            actions: [succeedQuest],
            target: "checkSuccessEOG",
          },
        ],
      },

      checkFailureEOG: {
        entry: logEvent("check quest fail end of game"),
        always: [
          {cond: "failMajority", target: "evilWinsByQuestFails"},
          {target: "propose", actions: [nextQuest, resetRejections]},
        ],
        // on: {
        //   TRIGGER: "evilWins",
        //   NEXT: "propose",
        // },
      },

      checkSuccessEOG: {
        entry: logEvent("check quest success end of game"),
        always: [
          {cond: "successMajority", target: "assassinate"},
          {target: "propose", actions: [nextQuest, resetRejections]},
        ],
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

      //? could be better?, unify with evilWins
      // further unify with an 'end of game' state?
      // but what way to indicate cause of end of game, context?
      // or should machine not need or care to know why
      // let interpreter well.. interpret how a game ended
      // via considering prev state and other context
      evilWinsByRejections: {
        entry: logEvent("evil wins by rejections"),
        type: "final",
      },

      evilWinsByQuestFails: {
        entry: logEvent("evil wins by quest fails"),
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
        if (!Array.isArray(nominees)) return false;
        if (nominees.length !== quests[quest_i].teamSize) return false;

        const proposedByLeader = sourcePlayerIdx === leader_i;
        const validTeamIndices = nominees.every(
          (idx) => idx >= 0 && idx < length,
        );

        return proposedByLeader && validTeamIndices;
      },

      canDecide: (
        {decisions, nominees, players},
        {sourcePlayerIdx, decision},
      ) => {
        if (typeof decision !== "boolean") return false;
        if (!nominees.includes(sourcePlayerIdx)) return false;
        if (decisions[sourcePlayerIdx] != null) return false;

        return decision || players[sourcePlayerIdx].character.side === "evil";
      },

      votesAreValid: ({players}, {votes}) => {
        if (!Array.isArray(votes)) return false;

        if (votes.length !== players.length) return false;

        return votes.every((v) => typeof v === "boolean");
      },

      teamIsRejected: (
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
      ) => votes.filter(Boolean).length * 2 <= length,

      overRejectionsLimit: ({rejections}) => rejections >= 5,

      allDecisionsReceived: ({decisions, nominees}) =>
        decisions.filter((d) => d != null).length === nominees.length,

      questFailed: ({decisions, nominees, quests, quest_i}) => {
        const failCount = nominees.length - decisions.filter(Boolean).length;
        return failCount >= quests[quest_i].failsReq;
      },

      failMajority: ({quests}) =>
        quests.filter(({side}) => side === "evil").length * 2 > quests.length,

      successMajority: ({quests}) =>
        quests.filter(({side}) => side === "good").length * 2 > quests.length,
    },
  },
);

module.exports = gameMachine;
