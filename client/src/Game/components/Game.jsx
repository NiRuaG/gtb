// @flow

import React from "react";
import {propSatisfies, equals} from "ramda";
import styled, {css, type StyledComponent} from "styled-components";

import PlayersContent from "./PlayersContent";
import QuestsContent from "./QuestsContent";

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
  grid-template-columns: max-content [QComp] max-content [QCurr] max-content [QFut] max-content;
  grid-template-rows: max-content repeat(10, 1fr) max-content;
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
  const {
    socket,
    amConnected,
    users,
    myID,
    isReady,
    playersByID,
    gameState,
    quests,
    currentQuestIdx,
    leaderIdx,
  } = useSocket();

  //? maybe consider other way than finding each time
  //? construct users as a map?
  const myUser =
    (myID != null && users.find(propSatisfies(equals(myID), "id"))) || null;

  const gameHasStarted = gameState !== "idle";

  return (
    <>
      {amConnected && (
        <MainLayout>
          {socket && myUser && (
            <PlayersContent
              socket={socket}
              gameState={gameState}
              isReady={isReady}
              users={users}
              myUser={myUser}
              playersByID={playersByID}
            />
          )}

          {quests && currentQuestIdx && (
            <QuestsContent quests={quests} currentQuestIdx={currentQuestIdx} />
          )}
        </MainLayout>
      )}

      <Diagnostics>
        <p>
          ID:{" "}
          <small>
            <code>{myID}</code>
          </small>
        </p>
        <p>Connected: {String(amConnected)}</p>
        <p>Privileges: {String(myUser?.privileged)}</p>
        <p>Permitted: {String(myUser?.permitted)}</p>
        <p>Game State: {gameState}</p>
      </Diagnostics>
    </>
  );
};
