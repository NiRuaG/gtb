// @flow

import React from "react";

import type {QuestT} from "Quest";

type Props = {|
  isCurrQuest: boolean,
  quest: QuestT,
|};

export default ({
  isCurrQuest,
  quest: {teamSize, failsReq, side = null, failures},
}: Props) => (
  <div
    style={{
      display: "flex",
      flexFlow: "column nowrap",
      alignItems: "center",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        marginLeft: "0.3rem",
        userSelect: "none",
        width: "4rem",
        height: "4rem",
        borderRadius: "2rem",
        border: side == null ? "2px solid black" : "none",
        color: side != null || isCurrQuest ? "white" : "black",
        background:
          side != null
            ? {
                good: "dodgerblue",
                evil: "crimson",
              }[side]
            : isCurrQuest
            ? "black"
            : "white",
      }}
    >
      <span style={{fontSize: "2rem"}}>{teamSize}</span>
    </div>
    {failures ? (
      <p>
        <small>{failures} failures</small>
      </p>
    ) : (
      <p style={{visibility: failsReq > 1 ? "visible" : "hidden"}}>
        <small>{failsReq} fails</small>
      </p>
    )}
  </div>
);
