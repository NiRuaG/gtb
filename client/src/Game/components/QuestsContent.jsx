// @flow

import React from "react";
import {splitAt} from "ramda";

import type {Players} from "Player";
import Quest, {type QuestT, type Quests} from "Quest";
import type {UserID} from "User";

type Props = {|
  +quests: ?Quests,
  +currentQuestIdx: ?number,
  +leaderID: UserID,
  +players: Players,
|};

export default ({quests, currentQuestIdx, players}: Props) => {
  if (quests == null || currentQuestIdx == null) return null;

  const [
    completedQuests,
    [currentQuest, ...incompleteQuests],
  ] = splitAt<QuestT>(currentQuestIdx, quests);

  return (
    <>
      <div style={{gridColumnStart: "QComp", display: "flex"}}>
        {completedQuests.map((quest, idx) => (
          <Quest key={`Quest-Comp-${idx}`} quest={quest} isCurrQuest={false} />
        ))}
      </div>

      <CurrentQuest quest={currentQuest} players={players} />

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
|};

const CurrentQuest = ({quest, players}: CurrentQuestProps) => {
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
        <div
          style={{
            display: "flex",
            borderRight: "1px solid",
            borderBottom: "1px solid",
          }}
        >
          {Array(5)
            .fill(true)
            .map((_, i) => (
              <div
                key={`vote-track-${i}`}
                style={{
                  borderLeft: "1px solid",
                  width: "2.5rem",
                  display: "flex",
                  justifyContent: "center",
                  background: i === 4 ? "lightcoral" : "inherit",
                }}
              >
                {i + 1}
              </div>
            ))}
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
          {quest.voting?.map(({leaderID, team, votes}, vi) => {
            const teamSet = new Set(team);
            const approved = String(votes?.[pi] ?? null);

            return (
              <div
                key={`${pi}-voted-${vi}`}
                style={{
                  display: "flex",
                  justifyContent: "center",
                  borderLeft: "1px solid",
                  width: "2.5rem",
                  alignItems: "center",
                  background: {
                    true: "mediumseagreen",
                    false: "crimson",
                    null: "inherit",
                  }[approved],
                }}
              >
                {leaderID === user.id && "L"}
                {teamSet.has(user.id) && "T"}
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
};
