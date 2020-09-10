// @flow

import type {Side} from "Side";
import type {UserID} from "User";

type VotingDetails = {|
  +leaderID: UserID,
  +team?: $ReadOnlyArray<UserID>,
  +votes?: $ReadOnlyArray<boolean>,
  +approved?: boolean,
|};

export type QuestT = {|
  +teamSize: number,
  +failsReq: number,
  +failures?: number,
  +side?: Side,
  +voting?: $ReadOnlyArray<VotingDetails>,
|};

export type Quests = $ReadOnlyArray<QuestT>;
