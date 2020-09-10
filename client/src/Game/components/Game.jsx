// @flow

import React from "react";
import {propSatisfies, equals} from "ramda";
import styled, {css, type StyledComponent} from "styled-components";

import shuffle from "common/shuffle";
import useSocket from "socket/hook";

import PlayersContent from "./PlayersContent";
import QuestsContent from "./QuestsContent";

const fullScreenCss = css`
  height: 100vh;
  width: 100vw;
`;
type Empty = {||};

const MainLayout: StyledComponent<Empty, Empty, HTMLDivElement> = styled.div`
  ${fullScreenCss}
  display: grid;
  grid-template-columns: max-content [QComp] max-content [QCurr] max-content [QFut] max-content;
  grid-template-rows: max-content repeat(10, 1fr) max-content;
  background: white;
  padding: 2rem 3rem;
`;

const Diagnostics: StyledComponent<Empty, Empty, HTMLDivElement> = styled.div`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 0.5rem;
  border: 1px solid black;
  border-radius: 0.5rem;
`;

const Overlay: StyledComponent<Empty, Empty, HTMLDivElement> = styled.div`
  ${fullScreenCss}
  position: fixed;
  background: crimson;
  display: flex;
  justify-content: center;
  align-items: center;
  top: 0;
  bottom: 0;
  right: 0;
  left: 0;
  opacity: 0.7;
`;

export default () => {
  const {
    socket,
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
    voteCount,
  } = useSocket();

  //? maybe consider other way than finding each time
  //? construct users as a map?
  const myUser =
    (myID != null && users.find(propSatisfies(equals(myID), "id"))) || null;
  const myPlayer =
    (myID != null && players.find(({user: {id}}) => id === myID)) || null;

  // const gameHasStarted = gameState !== "idle";
  const amLeader = leaderID != null && myUser?.id === leaderID;
  const amOnQuest =
    quests?.[questIdx ?? -1]?.voting?.[voteIdx ?? -1]?.team?.includes(
      myUser?.id,
    ) ?? false;
  console.log("team", quests?.[questIdx ?? -1]?.voting?.[voteIdx ?? -1]?.team);
  console.log({amOnQuest});
  const amPrivileged = myUser?.privileged ?? false;

  const handleNewGame = () => socket?.emit("newGame");

  return (
    <>
      {amConnected && (
        <MainLayout>
          <PlayersContent
            socket={socket}
            gameState={gameState}
            isReady={isReady}
            users={users}
            myUser={myUser}
            players={players}
          />

          {quests == null || questIdx == null || voteIdx == null || (
            <QuestsContent
              socket={socket}
              gameState={gameState}
              quests={quests}
              canVote={canVote}
              questIdx={questIdx}
              voteIdx={voteIdx}
              players={players}
              amLeader={amLeader}
              amOnQuest={amOnQuest}
              voteCount={voteCount}
              myPlayer={myPlayer}
            />
          )}
        </MainLayout>
      )}

      {/* {true && ( */}
      {gameState === "evilWinsByRejections" && (
        <Overlay>
          <div
            style={{
              display: "flex",
              flexFlow: "column noWrap",
              alignItems: "center",
            }}
          >
            <h2 style={{color: "white"}}>
              <em>Loyal eyes clouded by paranoia cannot see a way forward.</em>
            </h2>
            <h2 style={{color: "white"}}>
              Mordred's dark forces of Evil triumph!
            </h2>
            {/* {true && ( */}
            {amPrivileged && <button onClick={handleNewGame}>Again!</button>}
          </div>
        </Overlay>
      )}

      <Diagnostics>
        <p>
          ID:{" "}
          <small>
            <code>{myID}</code>
          </small>
        </p>
        <p>Connected: {String(amConnected)}</p>
        <p>Privileges: {String(amPrivileged)}</p>
        <p>Permitted: {String(myUser?.permitted)}</p>
        <p>Game State: {gameState}</p>
      </Diagnostics>
    </>
  );
};
