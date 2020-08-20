const {interpret} = require("xstate");
const {canStart} = require("./config");
const gameService = require("./machine");
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
    this.service = gameService;
    this.voteHistory = [];
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

      if (quests) {
        quests[quest_i].voting = Array.from({length: 5}, (_, i) => {
          const leaderID = this.usersByPlayerIdx.get(
            (leader_i + i) % this.usersByPlayerIdx.size,
          ).id;
          return {leaderID};
        });
        quests[quest_i].voting[rejections].team = nominees.map(
          (idx) => this.usersByPlayerIdx.get(idx).id,
        );
        server.emit("quests", quests, quest_i);
      }

      server.emit("voteIdx", rejections);

      if (leader_i != null) {
        server.emit("leaderID", this.usersByPlayerIdx.get(leader_i).id);
      }
    });

    this.service.start();
  }

  hasStarted = () => this.service.state.value !== "idle"; //? != ~this.service.machine.initialState~

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

        // reset currentVotes to empty
        // console.log("resetting current vote");
        this.currentVotes = Array(users.length).fill(null);
      });

      user.connection.on("castVote", (approval) => {
        console.log(user.name, "approval", approval);
        // console.log(this.service.state.context);
        this.currentVotes[thisPlayerIdx] = approval;
        if (this.currentVotes.every((v) => v != null)) {
          console.log("have all votes", this.currentVotes);
          this.service.send("VOTE", {votes: this.currentVotes});

          if (!this.lastStateChanged) {
          }
        }
        // this.voteHistory[this.service.machine.context.quest_i];
      });
    });

    return true; // signify game started successfully

    //? this.service.onDone(() => return true);
  }
}

module.exports = GameServer;
