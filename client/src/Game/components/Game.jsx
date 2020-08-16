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
  background: white;
  display: grid;
  grid-template-columns: max-content [QComp] max-content [QCurr] max-content [QFut] max-content;
  grid-template-rows: max-content repeat(10, 1fr) max-content;
  /* row-gap: 0.2rem; */

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
    players,
    gameState,
    // quests,
    // currentQuestIdx,
  } = useSocket();

  //? maybe consider other way than finding each time
  //? construct users as a map?
  const myUser =
    (myID != null && users.find(propSatisfies(equals(myID), "id"))) || null;

  // const gameHasStarted = gameState !== "idle";

  const devIDS = users.map(({id}) => id);

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
            quests={[
              {teamSize: 2, failsReq: 1},
              {
                teamSize: 2,
                failsReq: 1,
                voting: [
                  {
                    leaderID: users[0]?.id ?? "??",
                    team: (shuffle(devIDS), devIDS.slice(0, 2)),
                    votes: players.map((p) => Math.random() > 0.5),
                    approved: Math.random() > 0.5,
                  },
                  {
                    leaderID: users[1]?.id ?? "??",
                    team: (shuffle(devIDS), devIDS.slice(0, 2)),
                    votes: players.map((p) => Math.random() > 0.5),
                  },
                  {leaderID: users[2]?.id ?? "??"},
                  {leaderID: users[3]?.id ?? "??"},
                  {leaderID: users[4]?.id ?? "??"},
                ],
              },
              {teamSize: 2, failsReq: 1},
              {teamSize: 2, failsReq: 2},
            ]}
            // quests={null}
            currentQuestIdx={1}
            // currentVoteIdx={0}
            players={players}
            leaderID={"???"}
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
