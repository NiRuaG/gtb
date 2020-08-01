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
  border: 1px solid black;
  padding: 0.5rem;
`;

type $Nullable<T> = T | null;

type Name = string;
type Index = number;

// type Side = "good" | "evil";
// type Char = {|
//   +side: Side,
//   +description: string,
//   +title?: string,
// |};

type User = {|
  +name?: $Nullable<Name>,
  +privileged: boolean,
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
  const [myIndex, setMyIndex] = useState<number | null>(null);
  const [formName, setFormName] = useState<$Nullable<Name>>(null);
  // const [isReady, setIsReady] = useState(false);
  // const [publicInfo, setPublicInfo] = useState<$Nullable<PubInfo>>(null);

  useEffect(() => {
    const socket = openSocket("/");
    socketRef.current = socket;

    // socket.on("connect", () => console.log("connect"));
    // socket.on("disconnect", () => console.log("disconnect"));
    socket.on<boolean, void>("connected", setAmConnected);
    socket.on<Users, Index, void>("users", (users, index) => {
      setUsers(users);
      setMyIndex(index);
    });
    // socket.on("ready", setIsReady);
    // socket.on("public", setPublicInfo);

    return () => {
      socket.close();
    };
  }, []);

  const handleNameChange = (event: SyntheticEvent<HTMLInputElement>) => {
    setFormName(sanitizedName(event.currentTarget.value));
  };

  const handleNameSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formName) return;
    return socket?.emit("name", formName);
  };

  const handleStart = () => {
    return privileged && socket?.emit("start");
  };

  const myUser: User = (myIndex != null && users[myIndex]) || {
    privileged: false,
    // isLeader: false,
  };

  const {privileged, name: myName /* isLeader: amLeader */} = myUser;
  //? check name ~= formName

  const [{length: anonUsersLen}, namedUsers] = partition<User>(
    ({name}) => !name,
  )(users);
  const amAnon = !myName;

  return (
    <>
      <FullScreenLayout>
        <div style={{marginLeft: "5rem"}}>
          {amConnected && (
            <>
              {privileged && (
                <button disabled={true /*!isReady*/} onClick={handleStart}>
                  Start
                </button>
              )}

              <form onSubmit={handleNameSubmit}>
                <input
                  type="text"
                  placeholder="Your name"
                  autoFocus
                  value={formName ?? ""}
                  onChange={handleNameChange}
                />
              </form>

              <div>
                <p>Users connected: {users.length}</p>
                {namedUsers.map((user, idx) => {
                  const {name} = user;
                  return (
                    <Player
                      key={name + idx}
                      user={user}
                      self={name === myUser.name}
                    />
                  );
                })}
                {anonUsersLen > 0 && (
                  <>
                    <p>
                      {namedUsers.length > 0 && "and "} {anonUsersLen}{" "}
                      <i>Anonymous</i>
                      {anonUsersLen > 1 ? " courtiers" : " courtier"}
                      {amAnon && (
                        <span> ({anonUsersLen > 1 && "including "}me)</span>
                      )}
                    </p>
                  </>
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
        <p>Connected: {String(amConnected)}</p>
        <p>User Index: {myIndex}</p>
        <p>Game privileges: {String(privileged)}</p>
      </Diagnostics>
    </>
  );
};

type PlayerProps = {|
  +user: User,
  +self: boolean,
|};

const Player = ({user: {name}, self}: PlayerProps) => {
  // const character = player?.character;

  return (
    <p>
      {name ?? <i>Unnamed</i>} {self && "(me)"}
      {/* , character ? charText(character) : ""].join(" ") */}
      {/* character?.side === "evil" && <span>: EVIL!</span>} */}
      {/* {isLeader && <strong>Leader</strong>} */}
    </p>
  );
};
