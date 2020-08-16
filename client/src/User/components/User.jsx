// @flow

import React from "react";

import type {UserT} from "User";
import type {PlayerT} from "Player";

const charText = ({side, description, title}) => (
  <>
    {`(${side}) `}
    {`${title ? `${title} - ` : ""}`}
    <small>{description ?? ""}</small>
  </>
);

type Props = {|
  +user: UserT,
  +self: boolean,
  +player?: PlayerT,
|};

export default ({user: {name}, self, player}: Props) => {
  const character = player?.character;

  return (
    <div
      style={{
        marginLeft: "1rem",
        display: "flex",
        flexFlow: "column nowrap",
        justifyContent: "space-around",
        height: "100%",
      }}
    >
      <p>
        {name}
        {self && " (me)"}
      </p>

      <p>{character && charText(character)}</p>
    </div>
  );
};
