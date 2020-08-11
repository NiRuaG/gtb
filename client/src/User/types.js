// @flow

type ID = string;
type Name = string;

export type UserT = {|
  +id: ID,
  +name: ?Name,
  +privileged: boolean,
  +permitted: boolean,
|};
export type Users = $ReadOnlyArray<UserT>;
