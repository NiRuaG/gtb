const {interpret} = require("xstate");
const {canStart} = require("./config");
const gameMachine = require("./machine");
const shuffle = require("./../../client/src/common/shuffle");

const log = (msg, ...rest) => console.log("Game Server >", msg, ...rest);

const knowsOfEvil = ({character}) =>
  character.side === "evil" || character.title === "Merlin";

const AN_EVIL_CHARACTER_PLAYER = {
  character: {side: "evil"},
};

class GameServer {
  constructor(server) {
    log("constructing game with server", server);
    this.server = server;
    this.service = interpret(gameMachine); // new interpreter instance
    this.questVotesHistory = Array(5).fill(null);
    this.currentVotes = [];
    this.decidedQuestIdx = null;
    this.previousState = null;

    this.service.onTransition(({value, changed}) => {
      log("onTransition >", "value:", value, "changed:", changed);
      this.lastStateChanged = changed;
      log(`emitting gameState as "${value}"`);
      this.server.emit("gameState", value);

      this.previousState = value;
    });

    // Context change listener
    this.service.onChange((newContext, prevContext) => {
      log("onChange >", {newContext}, {prevContext});

      const {
        players,
        quests,
        quest_i,
        leader_i,
        rejections,
        nominees,
        decisions,
      } = newContext;

      //? player character assignment only needs to be done once
      // possibly make it its own emit?
      players.forEach((thisPlayer, thisIdx) => {
        const thisUser = this.usersByPlayerIdx.get(thisIdx);

        thisUser.connection.emit(
          "players",
          players.map((thatPlayer, thatIdx) => {
            const {id, name} = this.usersByPlayerIdx.get(thatIdx);

            return {
              // if this player knows of evil, and that player is evil
              ...(knowsOfEvil(thisPlayer) &&
              thatPlayer.character.side === "evil"
                ? AN_EVIL_CHARACTER_PLAYER
                : {}),

              // all players know themselves
              ...(thisIdx === thatIdx ? thisPlayer : {}),

              // all players know other player's user id's & names
              user: {id, name},
            };
          }),
        );
      });

      if (quests && quest_i != null) {
        if (this.questVotesHistory[quest_i] == null) {
          this.questVotesHistory[quest_i] = Array.from({length: 5}, (_, i) => {
            const leaderID = this.usersByPlayerIdx.get(
              (leader_i + i) % this.usersByPlayerIdx.size,
            ).id;

            return {leaderID};
          });
        }

        if (
          nominees.length &&
          this.questVotesHistory[quest_i][rejections].team == null
        ) {
          this.questVotesHistory[quest_i][rejections].team = nominees.map(
            (idx) => this.usersByPlayerIdx.get(idx).id,
          );
        }

        this.assignVoteHistoryToQuestsAndEmit({quests, quest_i});
        // console.log({quests});
      }

      this.server.emit("voteIdx", rejections); // TODO: consistency of var name

      if (leader_i != null) {
        this.server.emit("leaderID", this.usersByPlayerIdx.get(leader_i).id);
      }
    });

    this.service.start();
  }

  assignVoteHistoryToQuestsAndEmit = ({quests, quest_i}) => {
    quests.forEach((quest, qi) => {
      quest.voting = this.questVotesHistory[qi];
    });

    console.log("qvh", this.questVotesHistory);
    console.log("quests", {quests});
    this.server.emit("quests", quests, quest_i);
  };

  hasStarted = () =>
    this.service.state.value !== this.service.machine.initialState.value;

  hasFinished = () => this.service.state.done;

  canStart = canStart;

  start(users) {
    log("starting game server with users", {users});
    this.playerIdxByUserId = new Map(users.map(({id}, idx) => [id, idx]));
    this.usersByPlayerIdx = new Map(users.map((user, idx) => [idx, user]));

    this.service.send("START", {players: {length: users.length}});

    if (!this.lastStateChanged) {
      console.log("state did not change after sending START event");
      return false; // false to signify game failed to start
    }

    // incoming msg handlers
    users.forEach((user) => {
      const thisPlayerIdx = this.playerIdxByUserId.get(user.id);

      user.connection.on("propose", (teamIDs) => {
        const nominees = teamIDs.map((id) => this.playerIdxByUserId.get(id));

        this.service.send("NOMINATE", {
          sourcePlayerIdx: thisPlayerIdx,
          nominees,
        });

        if (!this.lastStateChanged) {
          console.log("state did not change after sending NOMINATE event");
          // todo: nack
          return;
        }

        // ? these two v similar, possibly link side effects to one
        // reset currentVotes to empty
        // console.log("resetting current vote");
        this.currentVotes = Array(users.length).fill(null);
        // reset vote capabilities for all
        users.forEach(({connection}) => connection.emit("canVote", true));
      });

      user.connection.on("castVote", (approval) => {
        console.log("Received vote from user", user.id, {approval});

        if (this.currentVotes[thisPlayerIdx] == null) {
          this.currentVotes[thisPlayerIdx] = approval;
        } else {
          console.log("..but already have vote recorded for user");
          console.log(
            "..vote does not change from",
            this.currentVotes[thisPlayerIdx],
          );
        }

        user.connection.emit("canVote", false);
        const voteCount = this.currentVotes.filter((v) => v != null).length;
        this.server.emit("voteCount", voteCount);

        if (voteCount === users.length) {
          console.log("..now have all votes", this.currentVotes);
          const {quest_i, rejections} = this.service.state.context;
          this.questVotesHistory[quest_i][rejections].votes = this.currentVotes;

          this.service.send("VOTE", {votes: this.currentVotes});

          if (!this.lastStateChanged) {
            //TODO
          }

          if (this.service.state.value !== "propose") {
            this.questVotesHistory[quest_i][rejections].approved = true;
          }
          this.server.emit("voteCount", 0);
        }
      });

      user.connection.on("decide", (decision) => {
        console.log("Received", {decision}, "from user", user.id);
        this.decidedQuestIdx = this.service.state.context.quest_i;
        this.service.send("DECIDE", {sourcePlayerIdx: thisPlayerIdx, decision});

        if (!this.lastStateChanged) {
          // TODO
          return;
        }

        // at this point, decision was accepted
        //? could help ui and emit that player can no longer decide
        // lastStateChanged will be true (even if from questing > questing)
        // so long as it passed the guard
        const {
          context: {quests, quest_i, decisions},
          value,
        } = this.service.state;

        if (value !== "questing") {
          quests[this.decidedQuestIdx].failures = decisions.filter(
            (d) => d === false,
          ).length;

          this.assignVoteHistoryToQuestsAndEmit({quests, quest_i});
          this.decidedQuestIdx = null;
        }
      });
    });

    this.service.onDone(() => {
      console.log("Service done, stopping");
      users.forEach(({connection}) => {
        connection
          .removeAllListeners("propose")
          .removeAllListeners("castVote")
          .removeAllListeners("decide");
      });
      this.service.stop();
    });

    return true; // signify game started successfully

    //? this.service.onDone(() => return true);
  }
}

module.exports = GameServer;
