// @flow

import React from "react";
import {splitAt} from "ramda";

import Quest, {type QuestT, type Quests} from "Quest";

type Props = {|
  +quests: Quests,
  +currentQuestIdx: number,
|};

export default ({quests, currentQuestIdx}: Props) => {
  const [completed, [currentQuest, ...incomplete]] = splitAt<QuestT>(
    currentQuestIdx,
    quests,
  );

  return (
    <div style={{gridColStart: 2, display: "flex"}}>
      {completed.map((quest, idx) => (
        <Quest key={`Quest-Comp-${idx}`} quest={quest} isCurrQuest={false} />
      ))}

      <Quest quest={currentQuest} isCurrQuest={true} />

      {incomplete.map((quest, idx) => (
        <Quest key={`Quest-Incomp-${idx}`} quest={quest} isCurrQuest={false} />
      ))}
    </div>
  );
};
