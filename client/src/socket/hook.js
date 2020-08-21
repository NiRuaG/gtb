// @flow

import {useEffect, useRef, useState} from "react";
import openSocket, {type Socket} from "socket.io-client";

import type {Users, UserID} from "User";
import type {PlayerT} from "Player";
import type {Quests} from "Quest";

export type {Socket} from "socket.io-client";

export default () => {
  const socketRef = useRef<?Socket>(null);

  const [amConnected, setAmConnected] = useState(false);
  const [users, setUsers] = useState<Users>([]);
  const [myID, setMyID] = useState<?UserID>(null);
  const [isReady, setIsReady] = useState(false);
  const [players, setPlayers] = useState<$ReadOnlyArray<PlayerT>>([]);
  const [leaderID, setLeaderID] = useState<?UserID>(null);
  const [gameState, setGameState] = useState("idle"); // ? common piece of const data
  const [quests, setQuests] = useState<?Quests>(null);
  const [questIdx, setQuestIdx] = useState<?number>(null);
  const [voteIdx, setVoteIdx] = useState<?number>(null);
  const [canVote, setCanVote] = useState(false);

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
    socket.on("players", setPlayers);
    socket.on<string, void>("gameState", setGameState);
    socket.on<Quests, number, void>("quests", (quests, idx) => {
      setQuests(quests);
      setQuestIdx(idx);
    });
    socket.on<?number, void>("voteIdx", setVoteIdx);
    socket.on<?UserID, void>("leaderID", setLeaderID);
    socket.on<boolean, void>("canVote", setCanVote);

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
    players,
    gameState,
    quests,
    questIdx,
    voteIdx,
    leaderID,
    canVote,
  };
};
