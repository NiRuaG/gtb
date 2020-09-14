// @flow

import type {Side} from "Side";
import type {UserT} from "User";

type Character = {|
  +description?: string,
  +side: Side,
  +title?: string,
|};

export type PlayerT = {|
  +character?: Character,
  +user: UserT,
|};

export type Players = $ReadOnlyArray<PlayerT>;
