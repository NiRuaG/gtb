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
  padding: 2rem 5rem;
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
    players,
    gameState,
    quests,
    questIdx,
    voteIdx,
    leaderID,
  } = useSocket();

  //? maybe consider other way than finding each time
  //? construct users as a map?
  const myUser =
    (myID != null && users.find(propSatisfies(equals(myID), "id"))) || null;

  // const gameHasStarted = gameState !== "idle";
  const amLeader = leaderID != null && myUser?.id === leaderID;

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

          <QuestsContent
            socket={socket}
            gameState={gameState}
            quests={quests}
            // quests={[
            //   {
            //     voting: [
            //       {
            //         votes: players.map((p) => Math.random() > 0.5),
            //         approved: Math.random() > 0.5,
            //       },
            //       {
            //         votes: players.map((p) => Math.random() > 0.5),
            //       },
            // ]}
            questIdx={questIdx}
            voteIdx={voteIdx}
            players={players}
            amLeader={amLeader}
          />
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
