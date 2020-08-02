//@flow

import React, {useEffect, useRef, useState} from "react";
import openSocket from "socket.io-client";
import {partition} from "ramda";
import styled, {type StyledComponent} from "styled-components";

import sanitizedName from "./common/sanitizedName";

type Empty = {||};
const FullScreenLayout: StyledComponent<
  Empty,
  Empty,
  HTMLDivElement,
> = styled.div`
  height: 100vh;
  width: 100vw;
  background: white;
  display: flex;
  flex-flow: row nowrap;
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

type $Nullable<T> = T | null;

type Name = string;
type ID = string;

// type Side = "good" | "evil";
// type Char = {|
//   +side: Side,
//   +description: string,
//   +title?: string,
// |};

type User = {|
  +id: ID,
  +name: ?Name,
  +privileged: boolean,
  +permitted: boolean,
|};
type Users = $ReadOnlyArray<User>;

// type PlayerT = {|
//   +character?: {
//     +side: Side,
//     +description?: string,
//     +title?: string,
//   },
//   +isLeader?: boolean,
// |};
// type Players = $ReadOnlyArray<PlayerT>;

// type Quest = {|
//   +teamSize: number,
//   +failsReq: number,
// |};

// type PubPlayerInfo = {|
//   isLeader: boolean,
// |};

// type PubInfo = {
//   +quests: [Quest, Quest, Quest, Quest, Quest],
//   +players: $ReadOnlyArray<PubPlayerInfo>,
// };

// const charText = ({side, description, title}) =>
// `${title ? `${title} - ` : ""}${description ?? ""} (${side})`;

export default () => {
  const socketRef = useRef(null);
  const {current: socket} = socketRef;

  const [amConnected, setAmConnected] = useState(false);
  const [users, setUsers] = useState<Users>([]);
  const [myID, setMyID] = useState<$Nullable<ID>>(null);
  const [formName, setFormName] = useState<$Nullable<Name>>(null);
  // const [isReady, setIsReady] = useState(false);
  // const [publicInfo, setPublicInfo] = useState<$Nullable<PubInfo>>(null);

  useEffect(() => {
    const socket = openSocket("/");
    socketRef.current = socket;

    // socket.on("connect", () => console.log("connect"));
    // socket.on("disconnect", () => console.log("disconnect"));
    socket.on<boolean, void>("connected", setAmConnected);
    socket.on<Users, ID, void>("users", (users, ID) => {
      setUsers(users);
      setMyID(ID);
    });
    // socket.on("ready", setIsReady);
    // socket.on("public", setPublicInfo);

    return () => {
      socket.close();
    };
  }, []);

  //? maybe consider other way than finding each time
  //? construct users as a map?
  const myUser = (myID != null && users.find(({id}) => id === myID)) || {};
  const {
    privileged: amPrivileged = false,
    permitted: amPermitted = false,
  } = myUser;
  const amAnon = !myUser.name;

  const [{length: anonUsersLen}, namedUsers] = partition<User>(
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

  return (
    <>
      <FullScreenLayout>
        <div style={{marginLeft: "5rem"}}>
          {amConnected && (
            <>
              <form onSubmit={handleNameSubmit}>
                <input
                  type="text"
                  placeholder="Name"
                  autoFocus
                  value={formName ?? ""}
                  onChange={handleNameChange}
                />
              </form>

              <div>
                <p>{users.length} users connected</p>
                {permittedUsers.length > 0 && (
                  <p>
                    {permittedUsers.length}
                    {permittedUsers.length > 1 ? " users" : " user"}
                    {` playing: ${permittedUsers
                      .map(({name}) => name)
                      .join(", ")}`}
                  </p>
                )}

                {amPrivileged && (
                  <button disabled={true /*!isReady*/} onClick={handleStart}>
                    Start
                  </button>
                )}

                {namedUsers.map((user) => (
                  <Player
                    key={user.id}
                    user={user}
                    self={user.id === myUser.id}
                    amPrivileged={amPrivileged}
                    handlePermissionClick={() => togglePermission(user)}
                  />
                ))}

                {anonUsersLen > 0 && (
                  <p>
                    {namedUsers.length > 0 && "and "} {anonUsersLen}
                    <i> Anonymous</i>
                    {anonUsersLen > 1 ? " courtiers" : " courtier"}
                    {amAnon && (
                      <span> ({anonUsersLen > 1 && "including "}me)</span>
                    )}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
        {/* {publicInfo && (
          <div style={{marginLeft: "2rem"}}>
            <p>Quests</p>
            {publicInfo.quests.map(({teamSize, failsReq}, idx) => (
              <p>
                {idx + 1}: Team Size ({teamSize})
                {failsReq > 1 && <span> Requires {failsReq} failures</span>}
              </p>
            ))}
          </div>
        )} */}
      </FullScreenLayout>

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
      </Diagnostics>
    </>
  );
};

type PlayerProps = {|
  +user: User,
  +self: boolean,
  +amPrivileged: boolean,
  +handlePermissionClick: () => mixed,
|};

const Player = ({
  user: {name, permitted},
  self,
  amPrivileged,
  handlePermissionClick,
}: PlayerProps) => {
  // const character = player?.character;

  return (
    <div style={{display: "flex"}}>
      <button disabled={!amPrivileged || self} onClick={handlePermissionClick}>
        {permitted ? "✔" : "❌"}
      </button>

      <p>
        {name} {self && "(me)"}
        {/* , character ? charText(character) : ""].join(" ") */}
        {/* character?.side === "evil" && <span>: EVIL!</span>} */}
        {/* {isLeader && <strong>Leader</strong>} */}
      </p>
    </div>
  );
};
