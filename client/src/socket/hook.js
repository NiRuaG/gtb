// @flow

import {useEffect, useRef, useState} from "react";
import openSocket from "socket.io-client";

import type {UserT, Users} from "User";
import type {PlayerT} from "Player";
import type {Quests} from "Quest";

type UserID = $PropertyType<UserT, "id">;
export type PlayersMap = {|
  [UserID]: PlayerT,
|};

export default () => {
  const socketRef = useRef(null);

  const [amConnected, setAmConnected] = useState(false);
  const [users, setUsers] = useState<Users>([]);
  const [myID, setMyID] = useState<?UserID>(null);
  const [isReady, setIsReady] = useState(false);
  const [playersByID, setPlayersByID] = useState<?PlayersMap>(null);
  const [leaderIdx, setLeaderIdx] = useState<?number>(null);
  const [gameState, setGameState] = useState("idle");
  const [quests, setQuests] = useState<?Quests>(null);
  const [currQuestIdx, setCurrQuestIdx] = useState<?number>(null);

  useEffect(() => {
    const socket = openSocket("/");
    socketRef.current = socket;

    // socket.on("connect", () => console.log("connect"));
    // socket.on("disconnect", () => console.log("disconnect"));
    socket.on<boolean, void>("connected", setAmConnected);
    socket.on<Users, UserID, void>("users", (users, ID) => {
      setUsers(users);
      setMyID(ID);
    });
    socket.on<boolean, void>("ready", setIsReady);
    socket.on<PlayersMap, number, void>("players", (playersMap, idx) => {
      setPlayersByID(playersMap);
      setLeaderIdx(idx);
    });
    socket.on<string, void>("gameState", setGameState);
    socket.on<Quests, number, void>("quests", (quests, idx) => {
      setQuests(quests);
      setCurrQuestIdx(idx);
    });

    return () => {
      socket.close();
    };
  }, []);

  return {
    socket: socketRef.current,
    amConnected,
    users,
    myID,
    isReady,
    playersByID,
    leaderIdx,
    gameState,
    quests,
    currQuestIdx,
  };
};
