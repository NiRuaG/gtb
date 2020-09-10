// @flow

import React, {useState, useEffect} from "react";
import {splitAt} from "ramda";

import type {Players, PlayerT} from "Player";
import Quest, {VoteTrack, type QuestT, type Quests} from "Quest";
import type {UserID, UserT} from "User";
import type {Socket} from "socket/hook";

type Props = {|
  +socket: ?Socket,
  +quests: Quests,
  +questIdx: number,
  +players: Players,
  +voteIdx: number,
  +amLeader: boolean,
  +amOnQuest: boolean,
  +gameState: string,
  +canVote: boolean,
  +voteCount: number,
  +myPlayer: ?PlayerT,
|};

export default ({
  quests,
  questIdx,
  players,
  voteIdx,
  amLeader,
  amOnQuest,
  socket,
  gameState,
  canVote,
  voteCount,
  myPlayer,
}: Props) => {
  const [proposedTeamIDs, setProposedTeamIDs] = useState(new Set<UserID>());

  const [
    completedQuests,
    [currentQuest, ...incompleteQuests],
  ] = splitAt<QuestT>(questIdx, quests);

  const toggleOnTeam = ({id}) => {
    if (proposedTeamIDs.has(id)) {
      setProposedTeamIDs((ids) => (ids.delete(id), new Set(ids)));
    } else {
      setProposedTeamIDs((ids) => new Set(ids).add(id));
    }
  };

  return (
    <>
      <div style={{gridColumnStart: "QComp", display: "flex"}}>
        {completedQuests.map((quest, idx) => (
          <Quest key={`Quest-Comp-${idx}`} quest={quest} isCurrQuest={false} />
        ))}
      </div>

      <div
        style={{
          gridRowStart: 1,
          gridColumnStart: "QCurr",
          display: "flex",
          flexFlow: "column nowrap",
          alignItems: "center",
        }}
      >
        <Quest quest={currentQuest} isCurrQuest={true} />

        <VoteTrack
          quest={currentQuest}
          players={players}
          voteIdx={voteIdx}
          amLeader={amLeader}
          socket={socket}
          gameState={gameState}
          proposedTeamIDs={proposedTeamIDs}
        />
      </div>

      {players.map(({user}, pi) => (
        <div
          key={user.id}
          style={{
            gridRowStart: pi + 2,
            gridColumnStart: 3,
            display: "flex",
            justifyContent: "space-around",
            borderRight: "1px solid",
            borderBottom: "1px solid",
          }}
        >
          <PlayerVotingRow
            playerIdx={pi}
            quest={currentQuest}
            user={user}
            amLeader={amLeader}
            voteIdx={voteIdx}
            proposedTeamIDs={proposedTeamIDs}
            onUserClick={() => toggleOnTeam(user)}
            gameState={gameState}
          />
        </div>
      ))}

      <div
        style={{
          gridRowStart: players.length + 2,
          gridColumnStart: "QCurr",
          display: "flex",
          justifyContent: "center",
          height: "min-content",
          padding: "1rem",
        }}
      >
        <QuestActions
          gameState={gameState}
          amLeader={amLeader}
          amOnQuest={amOnQuest}
          socket={socket}
          voteIdx={voteIdx}
          canVote={canVote}
          voteCount={voteCount}
          proposedTeamIDs={proposedTeamIDs}
          currentQuest={currentQuest}
          players={players}
          myPlayer={myPlayer}
          questIdx={questIdx}
        />
      </div>

      <div style={{gridRowStart: 1, gridColumnStart: "QFut", display: "flex"}}>
        {incompleteQuests.map((quest, idx) => (
          <Quest
            key={`Quest-Incomplete-${idx}`}
            quest={quest}
            isCurrQuest={false}
          />
        ))}
      </div>
    </>
  );
};

type QuestActionsProps = {|
  +gameState: string,
  +amLeader: boolean,
  +amOnQuest: boolean,
  +socket: ?Socket,
  +questIdx: number,
  +voteIdx: number,
  +canVote: boolean,
  +voteCount: number,
  +proposedTeamIDs: $ReadOnlySet<UserID>,
  +currentQuest: QuestT,
  +players: Players,
  +myPlayer: PlayerT,
|};

const QuestActions = ({
  gameState,
  amLeader,
  amOnQuest,
  socket,
  voteIdx,
  questIdx,
  canVote,
  voteCount,
  proposedTeamIDs,
  currentQuest,
  players,
  myPlayer,
}: QuestActionsProps) => {
  const [myVote, setMyVote] = useState<?boolean>(null);
  const [myDecision, setMyDecision] = useState<?boolean>(null);

  useEffect(() => {
    setMyVote(null);
    setMyDecision(null);
  }, [voteIdx, questIdx]);

  const canPropose = proposedTeamIDs.size === currentQuest.teamSize;

  const proposeTeam = () => {
    if (!canPropose) return;
    return socket?.emit("propose", [...proposedTeamIDs]);
  };

  const castMyVote = (approved) => (
    setMyVote(approved), socket?.emit("castVote", approved)
  );

  const decide = (decision) => (
    setMyDecision(decision), socket?.emit("decide", decision)
  );

  // switch ("questing") {
  switch (gameState) {
    case "propose":
      if (amLeader)
        return (
          <button disabled={!canPropose} onClick={proposeTeam}>
            {`Propose (${proposedTeamIDs.size})`}
          </button>
        );
    //! fall-through, if not amLeader condition drops to this case
    case "castVotes":
      return (
        <div
          style={{
            display: "flex",
            flexFlow: "column nowrap",
            alignItems: "center",
          }}
        >
          <div>
            {myVote !== false && (
              <button disabled={!canVote} onClick={() => castMyVote(true)}>
                {myVote != null ? "Approved ✔" : "Approve"}
              </button>
            )}

            {myVote !== true && (
              <button
                style={{marginLeft: "0.3rem"}}
                disabled={!canVote}
                onClick={() => castMyVote(false)}
              >
                {myVote != null ? "Rejected ❌" : "Reject"}
              </button>
            )}
          </div>

          <p>
            {voteCount}/{players.length} votes cast
          </p>
        </div>
      );

    case "questing":
      const haveVoted = myDecision != null;
      const couldFailQuest = !haveVoted && myPlayer?.character?.side === "evil";

      return (
        amOnQuest && (
          <>
            {myDecision !== false && (
              <button
                style={{
                  flexBasis: "50%",
                  background: "dodgerblue",
                  color: "white",
                }}
                disabled={haveVoted}
                onClick={() => decide(true)}
              >
                Success
              </button>
            )}

            {myDecision !== true && (
              <button
                style={{
                  marginLeft: "1rem",
                  flexBasis: "50%",
                  ...(couldFailQuest || haveVoted
                    ? {
                        background: "crimson",
                        color: "white",
                      }
                    : {}),
                }}
                disabled={!couldFailQuest}
                onClick={() => decide(false)}
              >
                Failure
              </button>
            )}
          </>
        )
      );
    default:
      return null;
  }
};

type PlayerVotingRowProps = {|
  +amLeader: boolean,
  +onUserClick: (UserID) => mixed,
  +playerIdx: number,
  +proposedTeamIDs: $ReadOnlySet<UserID>,
  +user: UserT,
  +voteIdx: number,
  +quest: QuestT,
  +gameState: string,
|};

const PlayerVotingRow = ({
  amLeader,
  onUserClick,
  playerIdx,
  proposedTeamIDs,
  user,
  voteIdx,
  quest: {voting},
  gameState,
}: PlayerVotingRowProps) => {
  return (
    voting?.map(({leaderID, team, votes}, vi) => {
      const teamSet = new Set(team);
      const approved = String(votes?.[playerIdx] ?? null);

      return (
        <div
          key={`${playerIdx}-voted-${vi}`}
          style={{
            display: "flex",
            justifyContent: "center",
            borderLeft: "1px solid",
            width: "2.8rem",
            alignItems: "center",
            background: {
              true: "mediumseagreen",
              false: "crimson",
              null: "inherit",
            }[approved],
          }}
        >
          {amLeader && vi === voteIdx && gameState === "propose" ? (
            <button
              style={{width: "90%"}}
              disabled={false}
              onClick={onUserClick}
            >
              {proposedTeamIDs.has(user.id) ? "✔" : "❌"}
            </button>
          ) : (
            <>
              {leaderID === user.id && "L"}
              {teamSet.has(user.id) && "T"}
            </>
          )}
        </div>
      );
    }) ?? null
  );
};
