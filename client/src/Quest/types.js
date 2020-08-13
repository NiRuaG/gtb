// @flow

import type {Side} from "Side";

export type QuestT = {|
  +teamSize: number,
  +failsReq: number,
  +side?: Side,
|};

export type Quests = $ReadOnlyArray<QuestT>;
