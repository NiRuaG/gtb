// @flow

import React from "react";

import type {UserT} from "User";
import type {PlayerT} from "Player";

const charText = ({side, description, title}) =>
  `${title ? `${title} - ` : ""}${description ?? ""} (${side})`;

type Props = {|
  +user: UserT,
  +self: boolean,
  +amPrivileged: boolean,
  +handlePermissionClick: () => mixed,
  +player: ?PlayerT,
  +gameHasStarted: boolean,
|};

export default ({
  user: {name, permitted},
  self,
  amPrivileged,
  handlePermissionClick,
  player,
  gameHasStarted,
}: Props) => {
  const character = player?.character;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
      }}
    >
      <div style={{display: "flex"}}>
        <button
          // ? could make this based on content by displaying all content overlapped, with visibility none toggling
          style={{width: "3rem"}}
          disabled={!amPrivileged || self || gameHasStarted}
          onClick={handlePermissionClick}
        >
          {permitted ? "✔" : "❌"}
        </button>
      </div>
      <div style={{marginLeft: "1rem"}}>
        <p>
          {name}
          {self && " (me)"}
        </p>
        <p>
          {self && character
            ? charText(character)
            : character?.side === "evil" && <span>EVIL!</span>}
          &nbsp;
          {/* {isLeader && <strong>Leader</strong>} */}
        </p>
      </div>
    </div>
  );
};
