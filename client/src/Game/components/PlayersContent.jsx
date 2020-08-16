// @flow

import React, {useState} from "react";
import {partition} from "ramda";

import sanitizedName from "common/sanitizedName";
import type {Socket} from "socket/hook";
import type {Players} from "Player";
import User, {type UserT, type Users} from "User";

type Props = {|
  +socket: ?Socket,
  +gameState: string,
  +isReady: boolean,
  +users: Users,
  +myUser: ?UserT,
  +players: Players,
|};

export default ({
  socket,
  gameState,
  users,
  myUser,
  isReady,
  players,
}: Props) => {
  const amPrivileged = myUser?.privileged ?? false;
  const gameHasStarted = gameState !== "idle";
  const namedUsers = users.filter(({name}) => name);

  const togglePermission = ({id, permitted}) =>
    amPrivileged && socket?.emit("permit", id, !permitted);

  return (
    <>
      <div
        style={{
          gridRowStart: 1,
          marginBottom: "0.5rem",
          visibility: gameHasStarted ? "hidden" : "visible",
        }}
      >
        <LobbyInfo
          socket={socket}
          users={users}
          myUser={myUser}
          isReady={isReady}
        />
      </div>

      {gameHasStarted
        ? players.map((player, idx) => (
            <div
              key={player.user.id}
              style={{
                gridRowStart: idx + 2,
                borderBottom: "1px solid",
                padding: "0.2rem 1rem",
              }}
            >
              <User
                user={player.user}
                self={player.user.id === myUser?.id}
                player={player}
              />
            </div>
          ))
        : namedUsers.map((user, idx) => {
            const self = user.id === myUser?.id;

            return (
              <div
                key={user.id}
                style={{
                  gridRowStart: idx + 2,
                  alignSelf: "flex-start",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <button
                  // ? could make this based on content by displaying all content overlapped, with visibility none toggling
                  style={{width: "3rem"}}
                  disabled={!amPrivileged || self}
                  onClick={() => togglePermission(user)}
                >
                  {user.permitted ? "✔" : "❌"}
                </button>

                <User user={user} self={self} />
              </div>
            );
          })}
    </>
  );
};

type LobbyInfoProps = {|
  +socket: ?Socket,
  +users: Users,
  +myUser: ?UserT,
  +isReady: boolean,
|};

const LobbyInfo = ({socket, users, myUser, isReady}: LobbyInfoProps) => {
  const [formName, setFormName] = useState("");

  const amAnon = !myUser?.name;
  const amPrivileged = myUser?.privileged ?? false;
  const permittedUsers = users.filter(({permitted}) => permitted);
  const [{length: anonUsersLen}, namedUsers] = partition<UserT>(
    ({name}) => !name,
  )(users);

  const handleNameChange = (event: SyntheticEvent<HTMLInputElement>) => {
    setFormName(sanitizedName(event.currentTarget.value));
  };

  const handleStart = () => amPrivileged && socket?.emit("start");

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formName) {
      return setFormName(myUser?.name ?? "");
    }
    return socket?.emit("name", formName); // TODO: ack && setFormName
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Name"
          autoFocus
          value={formName}
          onChange={handleNameChange}
        />
      </form>

      <p>
        {users.length} {users.length > 1 ? "users" : "user"} connected
      </p>

      <p style={{visibility: anonUsersLen > 0 ? "inherit" : "hidden"}}>
        {anonUsersLen}
        <i> Anonymous</i>
        {anonUsersLen > 1 ? " courtiers" : " courtier"}
        {amAnon && <span> ({anonUsersLen > 1 && "including "}me)</span>}
        {namedUsers.length > 0 && " and"}
      </p>

      <p
        style={{
          visibility: permittedUsers.length > 0 ? "inherit" : "hidden",
        }}
      >
        {`${permittedUsers.length} / ${namedUsers.length} ${
          namedUsers.length > 1 ? " users" : " user"
        } playing ✔`}
      </p>

      {amPrivileged && (
        <button disabled={!isReady} onClick={handleStart}>
          Start
        </button>
      )}
    </>
  );
};
