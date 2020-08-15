// @flow

import React from "react";
import {splitAt} from "ramda";

import Quest, {type QuestT, type Quests} from "Quest";
import type {UserID} from "User";
import type {PlayersMap} from "socket/hook";

type Props = {|
  +quests: Quests,
  +currentQuestIdx: number,
  +playersByID: ?PlayersMap,
  +leaderID: UserID,
|};

export default ({quests, currentQuestIdx, playersByID}: Props) => {
  const [completed, [currentQuest, ...incomplete]] = splitAt<QuestT>(
    currentQuestIdx,
    quests,
  );

  return (
    <>
      <div style={{gridColumnStart: "QComp", display: "flex"}}>
        {completed.map((quest, idx) => (
          <Quest key={`Quest-Comp-${idx}`} quest={quest} isCurrQuest={false} />
        ))}
      </div>

      <CurrentQuest quest={currentQuest} playersByID={playersByID ?? {}} />

      <div style={{gridRowStart: 1, gridColumnStart: "QFut", display: "flex"}}>
        {incomplete.map((quest, idx) => (
          <Quest
            key={`Quest-Incomp-${idx}`}
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
  +playersByID: PlayersMap,
|};

const CurrentQuest = ({quest, playersByID}: CurrentQuestProps) => {
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

      {Array.from(
        {length: Object.entries(playersByID).length},
        (_) => true,
      ).map((_, pi) => (
        <div
          key={`player-${pi}-votes`}
          style={{
            gridRowStart: pi + 2,
            gridColumnStart: 3,
            display: "flex",
            justifyContent: "space-around",
            borderRight: "1px solid",
            borderBottom: "1px solid",
          }}
        >
          {[...[true, false], ...Array(5).fill(null)]
            .map(String)
            .slice(0, 5)
            .map((approved, vi) => (
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
                {`${Math.random() > 0.5 ? "L" : ""}T`}
              </div>
            ))}
        </div>
      ))}
    </>
  );
};
