// @flow

export type UserID = string;

export type UserT = {|
  +id: UserID,
  +name: ?string,
  +privileged: boolean,
  +permitted: boolean,
|};
export type Users = $ReadOnlyArray<UserT>;
