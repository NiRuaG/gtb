// @flow

import type {Side} from "Side";

type Character = {|
  +side: Side,
  +description?: string,
  +title?: string,
|};

export type PlayerT = {|
  +character?: Character,
  +isLeader?: boolean,
|};
