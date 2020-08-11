// @flow

type Side = "good" | "evil";

type Character = {|
  +side: Side,
  +description?: string,
  +title?: string,
|};

export type PlayerT = {|
  +character?: Character,
  +isLeader?: boolean,
|};
