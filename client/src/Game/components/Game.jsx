// @flow

import React, {useState} from "react";
import {partition, prop, propSatisfies, equals} from "ramda";
import styled, {css, type StyledComponent} from "styled-components";

import sanitizedName from "common/sanitizedName";

import User, {type UserT} from "User";
import Quest from "Quest";

import useSocket from "socket/hook";

const fullScreenCss = css`
  height: 100vh;
  width: 100vw;
`;
type Empty = {||};

const MainLayout: StyledComponent<Empty, Empty, HTMLDivElement> = styled.div`
  ${fullScreenCss}
  background: white;
  display: grid;
  /* grid-template-columns: [col-players-start] max-content [col-players-end] repeat(
      5,
      1fr
    ); */
  grid-template-rows: max-content repeat(10, min-content);
  row-gap: 0.2rem;

  padding-top: 2rem;
  padding-bottom: 2rem;
  padding-left: 5rem;
  /* justify-content: center; */
  /* align-items: center; */
  /* user-select: none; */
`;

const Diagnostics: StyledComponent<Empty, Empty, HTMLDivElement> = styled.div`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 0.5rem;
  border: 1px solid black;
  border-radius: 0.5rem;
`;

export default () => {
  const [formName, setFormName] = useState("");
  const {
    socket,
    amConnected,
    users,
    myID,
    isReady,
    playersByID,
    gameState,
    quests,
    currQuestIdx,
    leaderIdx,
  } = useSocket();

  //? maybe consider other way than finding each time
  //? construct users as a map?
  const myUser =
    (myID != null && users.find(propSatisfies(equals(myID), "id"))) || {};
  const {
    privileged: amPrivileged = false,
    permitted: amPermitted = false,
  } = myUser;
  const amAnon = !myUser.name;

  const [{length: anonUsersLen}, namedUsers] = partition<UserT>(
    ({name}) => !name,
  )(users);
  const permittedUsers = users.filter(({permitted}) => permitted);

  const handleNameChange = (event: SyntheticEvent<HTMLInputElement>) => {
    setFormName(sanitizedName(event.currentTarget.value));
  };

  const handleNameSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formName) return;
    return socket?.emit("name", formName);
  };

  const handleStart = () => amPrivileged && socket?.emit("start");
  const togglePermission = ({id, permitted}) =>
    amPrivileged && socket?.emit("permit", id, !permitted);

  const gameHasStarted = gameState !== "idle";

  return (
    <>
      <MainLayout>
        {amConnected && (
          <>
            <div>
              <form onSubmit={handleNameSubmit}>
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
                  <button
                    disabled={!isReady || gameHasStarted}
                    onClick={handleStart}
                  >
                    Start
                  </button>
                )}
              </div>
            </div>

            {namedUsers.map((user, idx) => (
              <span
                style={{
                  gridRowStart: idx + 2,
                  gridRowEnd: idx + 3,
                  alignSelf: "center",
                }}
              >
                <User
                  key={user.id}
                  user={user}
                  self={user.id === myUser.id}
                  player={playersByID?.[user.id]}
                  amPrivileged={amPrivileged}
                  handlePermissionClick={() => togglePermission(user)}
                  gameHasStarted={gameHasStarted}
                />
              </span>
            ))}

            {gameState === "idle" && anonUsersLen > 0 && (
              <p>
                {namedUsers.length > 0 && "and "} {anonUsersLen}
                <i> Anonymous</i>
                {anonUsersLen > 1 ? " courtiers" : " courtier"}
                {amAnon && <span> ({anonUsersLen > 1 && "including "}me)</span>}
              </p>
            )}
          </>
        )}

        <div style={{marginLeft: "5rem", display: "flex"}}>
          {gameHasStarted &&
            quests &&
            quests.map((quest, idx) => (
              <Quest
                key={`Quest${idx}`}
                isCurrQuest={currQuestIdx === idx}
                quest={quest}
              />
            ))}
        </div>
      </MainLayout>

      <Diagnostics>
        <p>
          ID:{" "}
          <small>
            <code>{myID}</code>
          </small>
        </p>
        <p>Connected: {String(amConnected)}</p>
        <p>Privileges: {String(amPrivileged)}</p>
        <p>Permitted: {String(amPermitted)}</p>
        <p>Game State: {gameState}</p>
      </Diagnostics>
    </>
  );
};
