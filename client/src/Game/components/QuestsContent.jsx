// @flow

import React, {useState} from "react";
import {splitAt} from "ramda";

import type {Players} from "Player";
import Quest, {type QuestT, type Quests} from "Quest";
import type {UserID, UserT} from "User";

type Props = {|
  +socket: ?Socket,
  +quests: ?Quests,
  +questIdx: ?number,
  +players: Players,
  +voteIdx: ?number,
  +amLeader: boolean,
  +gameState: string,
|};

export default ({
  quests,
  questIdx,
  players,
  voteIdx,
  amLeader,
  socket,
  gameState,
}: Props) => {
  if (quests == null || questIdx == null || voteIdx == null) return null;

  const [
    completedQuests,
    [currentQuest, ...incompleteQuests],
  ] = splitAt<QuestT>(questIdx, quests);

  return (
    <>
      <div style={{gridColumnStart: "QComp", display: "flex"}}>
        {completedQuests.map((quest, idx) => (
          <Quest key={`Quest-Comp-${idx}`} quest={quest} isCurrQuest={false} />
        ))}
      </div>

      <CurrentQuest
        quest={currentQuest}
        players={players}
        voteIdx={voteIdx}
        amLeader={amLeader}
        socket={socket}
        gameState={gameState}
      />

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

type CurrentQuestProps = {|
  +quest: QuestT,
  +players: Players,
  +voteIdx: number,
  +amLeader: boolean,
  +socket: ?Socket,
  +gameState: string,
|};

const CurrentQuest = ({
  quest,
  players,
  voteIdx,
  amLeader,
  socket,
  gameState,
}: CurrentQuestProps) => {
  const [proposedTeamIDs, setProposedTeamIDs] = useState<$ReadOnlySet<UserID>>(
    new Set(),
  );

  const canPropose = proposedTeamIDs.size === quest.teamSize;

  const toggleOnTeam = ({id}) => {
    if (proposedTeamIDs.has(id)) {
      setProposedTeamIDs(
        (proposedTeamIDs) => (
          proposedTeamIDs.delete(id), new Set(proposedTeamIDs)
        ),
      );
    } else {
      setProposedTeamIDs((proposedTeamIDs) => new Set(proposedTeamIDs).add(id));
    }
  };

  const proposeTeam = () => {
    if (!canPropose) return;
    return socket?.emit("propose", [...proposedTeamIDs]);
  };

  return (
    <>
      <div
        style={{
          gridRowStart: 1,
          gridColumnStart: "QCurr",
          display: "flex",
          flexFlow: "column nowrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Quest quest={quest} isCurrQuest={true} />
        <p>Vote Track</p>
        <div>
          {amLeader && gameState === "propose" ? (
            <button disabled={!canPropose} onClick={proposeTeam}>
              {`Propose (${proposedTeamIDs.size})`}
            </button>
          ) : (
            <button disabled={gameState !== "castVotes"}>todo_App/Rej</button>
          )}
        </div>
        <div
          style={{
            display: "flex",
            borderRight: "1px solid",
            borderBottom: "1px solid",
          }}
        >
          {[1, 2, 3, 4, 5].map((i) => {
            const isCurrVote = i - 1 === voteIdx;

            return (
              <div
                key={`vote-track-${i}`}
                style={{
                  borderLeft: "1px solid",
                  width: "2.8rem",
                  display: "flex",
                  justifyContent: "center",
                  background: isCurrVote
                    ? "black"
                    : i === 5
                    ? "lightcoral"
                    : "white",
                  color: isCurrVote ? "white" : "black",
                }}
              >
                {i}
              </div>
            );
          })}
        </div>
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
            quest={quest}
            user={user}
            amLeader={amLeader}
            voteIdx={voteIdx}
            proposedTeamIDs={proposedTeamIDs}
            onUserClick={() => toggleOnTeam(user)}
            gameState={gameState}
          />
        </div>
      ))}
    </>
  );
};

type PlayerVotingRowProps = {|
  +amLeader: boolean,
  +onUserClick: (UserID) => mixed,
  +playerIdx: number,
  +proposedTeamIDs: $ReadOnlySet<UserID>,
  +user: UserT,
  +voteIdx: number,
  +voting: QuestT,
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
