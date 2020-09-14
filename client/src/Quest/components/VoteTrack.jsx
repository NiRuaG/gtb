// @flow

import React from "react";

import type {QuestT} from "Quest";

type Props = {|
  +voteIdx: number,
  +single?: boolean,
|};

export default ({voteIdx, single = false}: Props) => {
  return (
    <div
      style={{
        display: "flex",
        flexFlow: "column nowrap",
        alignItems: "center",
      }}
    >
      {!single && <p>Vote Track</p>}

      <div
        style={{
          display: "flex",
          borderRight: single ? "none" : "1px solid",
          borderBottom: "1px solid",
        }}
      >
        {[1, 2, 3, 4, 5].map((i) => {
          if (single && i - 1 !== voteIdx) return null;

          const isCurrVote = i - 1 === voteIdx;

          return (
            <div
              key={`vote-track-${i}`}
              style={{
                borderLeft: single ? "none" : "1px solid black",
                width: "2.8rem",
                display: "flex",
                justifyContent: "center",
                background: single
                  ? "white"
                  : isCurrVote
                  ? "black"
                  : i === 5
                  ? "lightcoral"
                  : "white",
                color: isCurrVote && !single ? "white" : "black",
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
