// @flow

import {useEffect, useRef, useState} from "react";
import openSocket, {type Socket} from "socket.io-client";

import type {UserT, Users, UserID} from "User";
import type {PlayerT} from "Player";
import type {Quests} from "Quest";

export type {Socket} from "socket.io-client";

export type PlayersMap = {|
  [UserID]: PlayerT,
|};

export default () => {
  const socketRef = useRef<?Socket>(null);

  const [amConnected, setAmConnected] = useState(false);
  const [users, setUsers] = useState<Users>([]);
  const [myID, setMyID] = useState<?UserID>(null);
  const [isReady, setIsReady] = useState(false);
  const [playersByID, setPlayersByID] = useState<?PlayersMap>(null);
  const [leaderIdx, setLeaderIdx] = useState<?number>(null);
  const [gameState, setGameState] = useState("idle"); // ? common piece of const data
  const [quests, setQuests] = useState<?Quests>(null);
  const [currentQuestIdx, setCurrentQuestIdx] = useState<?number>(null);

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
      console.log({playersMap});
      setPlayersByID(playersMap);
      setLeaderIdx(idx);
    });
    socket.on<string, void>("gameState", setGameState);
    socket.on<Quests, number, void>("quests", (quests, idx) => {
      setQuests(quests);
      setCurrentQuestIdx(idx);
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
    currentQuestIdx,
  };
};
