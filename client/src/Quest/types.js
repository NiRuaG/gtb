// @flow

export type QuestT = {|
  +teamSize: number,
  +failsReq: number,
|};

export type Quests = $ReadOnlyArray<QuestT>;
