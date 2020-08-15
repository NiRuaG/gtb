// @flow

import React, {useState} from "react";
import {partition} from "ramda";

import sanitizedName from "common/sanitizedName";

import User, {type UserT, type Users} from "User";

import type {PlayersMap, Socket} from "socket/hook";

type Props = {|
  +socket: Socket,
  +gameState: string,
  +isReady: boolean,
  +users: Users,
  +myUser: UserT,
  +playersByID: ?PlayersMap,
|};

export default ({
  socket,
  gameState,
  users,
  myUser,
  isReady,
  playersByID,
}: Props) => {
  const [formName, setFormName] = useState("");

  const {privileged: amPrivileged = false} = myUser;
  const amAnon = !myUser.name;
  const [{length: anonUsersLen}, namedUsers] = partition<UserT>(
    ({name}) => !name,
  )(users);
  const permittedUsers = users.filter(({permitted}) => permitted);

  const gameHasStarted = gameState !== "idle";

  const handleNameSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formName || gameHasStarted) return;
    return socket?.emit("name", formName);
  };

  const handleNameChange = (event: SyntheticEvent<HTMLInputElement>) => {
    setFormName(sanitizedName(event.currentTarget.value));
  };

  const handleStart = () => amPrivileged && socket.emit("start");

  const togglePermission = ({id, permitted}) =>
    amPrivileged && socket.emit("permit", id, !permitted);

  return (
    <>
      <div style={{gridRowStart: 1, marginBottom: "0.5rem"}}>
        <form
          onSubmit={handleNameSubmit}
          style={{visibility: gameHasStarted ? "hidden" : "visible"}}
        >
          <input
            type="text"
            placeholder="Name"
            autoFocus
            value={formName}
            onChange={handleNameChange}
            disabled={gameHasStarted}
          />
        </form>

        <div>
          <p>
            {users.length} {users.length > 1 ? "users" : "user"} connected
          </p>
          {permittedUsers.length > 0 && (
            <p>
              {`${permittedUsers.length} / ${namedUsers.length} ${
                namedUsers.length > 1 ? " users" : " user"
              } playing ✔`}
            </p>
          )}

          {amPrivileged && (
            <button disabled={!isReady || gameHasStarted} onClick={handleStart}>
              Start
            </button>
          )}
        </div>
      </div>

      {namedUsers.map((user, idx) => (
        <div
          key={user.id}
          style={{
            gridRowStart: idx + 2,
            alignSelf: "flex-start",
            height: "100%",
            display: "flex",
            alignItems: "center",
            borderBottom: "1px solid",
          }}
        >
          <User
            user={user}
            self={user.id === myUser.id}
            player={playersByID?.[user.id]}
            amPrivileged={amPrivileged}
            handlePermissionClick={() => togglePermission(user)}
            gameHasStarted={gameHasStarted}
          />
        </div>
      ))}

      {gameState === "idle" && anonUsersLen > 0 && (
        <p style={{gridRowStart: -2}}>
          {namedUsers.length > 0 && "and "} {anonUsersLen}
          <i> Anonymous</i>
          {anonUsersLen > 1 ? " courtiers" : " courtier"}
          {amAnon && <span> ({anonUsersLen > 1 && "including "}me)</span>}
        </p>
      )}
    </>
  );
};
