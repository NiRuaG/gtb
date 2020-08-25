const {interpret} = require("xstate");
const {canStart} = require("./config");
const gameService = require("./machine");
const shuffle = require("./../../client/src/common/shuffle");
const e = require("express");

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
    this.service = gameService;
    this.questVotesHistory = Array(5).fill(null);
    this.currentVotes = [];

    this.service.onTransition(({value, changed}) => {
      log("onTransition >", "value:", value, "changed:", changed);
      this.lastStateChanged = changed;
      this.currentState = value;
      log(`emitting gameState as "${value}"`);
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

      const {
        players,
        quests,
        quest_i,
        leader_i,
        rejections,
        nominees,
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

        console.log({nominees}, this.questVotesHistory);
        if (
          nominees.length &&
          this.questVotesHistory[quest_i][rejections].team == null
        ) {
          this.questVotesHistory[quest_i][rejections].team = nominees.map(
            (idx) => this.usersByPlayerIdx.get(idx).id,
          );
        }
        console.log("qvh", this.questVotesHistory);

        quests.forEach((quest, qi) => {
          quest.voting = this.questVotesHistory[qi];
        });

        console.log({quests});

        // quests.forEach((quest, qi) => {
        //   if (quest.voting) {
        //     console.log("quest.voting", quest.voting);
        //     quest.voting.forEach((oneVoting, vi) => {
        //       oneVoting.votes = this.voteHistory[qi][vi];
        //     });
        //   }
        // });
        // console.log("vote.history", this.voteHistory);
        // console.log({quests});

        server.emit("quests", quests, quest_i);
      }

      server.emit("voteIdx", rejections); // TODO: consistency

      if (leader_i != null) {
        server.emit("leaderID", this.usersByPlayerIdx.get(leader_i).id);
      }
    });

    this.service.start();
  }

  hasStarted = () =>
    this.service.state.value !== this.service.machine.initialState.value;

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
        console.log(user.name, "approval", approval);
        // console.log(this.service.state.context);
        if (this.currentVotes[thisPlayerIdx] == null) {
          this.currentVotes[thisPlayerIdx] = approval;
        } else {
          //? TODO log
        }

        user.connection.emit("canVote", false);

        if (this.currentVotes.every((v) => v != null)) {
          console.log("have all votes", this.currentVotes);

          const {quest_i, rejections} = this.service.state.context;
          // console.log(
          //   {quest_i, rejections},
          //   this.currentVotes,
          //   this.voteHistory,
          // );
          this.questVotesHistory[quest_i][rejections].votes = this.currentVotes;
          // quests[quest_i].voting = Array.from({length: 5}, (_, i) => {
          //   const leaderID = this.usersByPlayerIdx.get(
          //     (leader_i + i) % this.usersByPlayerIdx.size,
          //   ).id;

          //   return {leaderID};
          // });

          // quests[quest_i].voting[rejections].team = nominees.map(
          //   (idx) => this.usersByPlayerIdx.get(idx).id,
          // );

          // quests.forEach((quest, qi) => {
          //   if (quest.voting) {
          //     console.log("quest.voting", quest.voting);
          //     quest.voting.forEach((oneVoting, vi) => {
          //       oneVoting.votes = this.voteHistory[qi][vi];
          //     });
          //   }
          // });
          // console.log("vote.history", this.voteHistory);
          // console.log({quests});

          this.service.send("VOTE", {votes: this.currentVotes});

          if (!this.lastStateChanged) {
            //TODO
          }
        }
        //TODO this.voteHistory[this.service.machine.context.quest_i];
      });
    });

    return true; // signify game started successfully

    //? this.service.onDone(() => return true);
  }
}

module.exports = GameServer;
