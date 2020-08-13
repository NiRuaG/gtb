// @flow

type ID = string;

export type UserT = {|
  +id: ID,
  +name: ?string,
  +privileged: boolean,
  +permitted: boolean,
|};
export type Users = $ReadOnlyArray<UserT>;
