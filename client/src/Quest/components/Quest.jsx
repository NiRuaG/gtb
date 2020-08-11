// @flow

import React from "react";

import type {QuestT} from "Quest";

type Props = {|
  isCurrQuest: boolean,
  quest: QuestT,
|};

export default ({isCurrQuest, quest: {teamSize, failsReq}}: Props) => (
  <div style={{display: "flex"}}>
    <div
      style={{
        display: "flex",
        flexFlow: "column nowrap",
        alignItems: "center",
        color: isCurrQuest ? "white" : "black",
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
          border: "2px solid black",
          background: isCurrQuest ? "black" : "white",
        }}
      >
        <span style={{fontSize: "2rem"}}>{teamSize}</span>
      </div>
      {failsReq > 1 && <p>2 fails</p>}
    </div>
  </div>
);
