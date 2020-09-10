// @flow

import React from "react";

import type {Players} from "Player";
import type {QuestT} from "Quest";
import type {UserID} from "User";
import type {Socket} from "socket/hook";

type Props = {|
  +quest: QuestT,
  +players: Players,
  +voteIdx: number,
  +amLeader: boolean,
  +socket: ?Socket,
  +gameState: string,
  +proposedTeamIDs: $ReadOnlySet<UserID>,
|};

export default ({
  quest,
  players,
  voteIdx,
  amLeader,
  socket,
  gameState,
  proposedTeamIDs,
}: Props) => {
  return (
    <div
      style={{
        display: "flex",
        flexFlow: "column nowrap",
        alignItems: "center",
      }}
    >
      <p>Vote Track</p>

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
                borderLeft: "1px solid black",
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
  );
};
