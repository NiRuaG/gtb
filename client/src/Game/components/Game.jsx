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
  grid-template-columns: max-content [Q1] max-content [Q2] max-content [Q3] max-content [Q4] max-content [Q5] max-content;
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

  console.log({quests});

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

          {/* {true && ( */}
          {quests == null || questIdx == null || voteIdx == null || (
            <QuestsContent
              socket={socket}
              gameState={gameState}
              amLeader={amLeader}
              amOnQuest={amOnQuest}
              voteCount={voteCount}
              myPlayer={myPlayer}
              canVote={canVote}
              quests={quests}
              voteIdx={voteIdx}
              questIdx={questIdx}
              players={players}
              // quests={[
              //   {
              //     teamSize: 2,
              //     failsReq: 1,
              //     side: "good",
              //     failures: 2,
              //     voting: [
              //       {
              //         leaderID: "E",
              //         votes: [false, false, false, false, false],
              //       },
              //       {
              //         leaderID: "D",
              //         votes: [true, true, true, true, true],
              //         approved: true,
              //         team: ["A", "B"],
              //       },
              //       {leaderID: "C", votes: []},
              //       {leaderID: "B", votes: []},
              //       {leaderID: "A", votes: []},
              //     ],
              //   },
              //   {
              //     teamSize: 3,
              //     failsReq: 1,
              //     side: "evil",
              //     voting: [
              //       {
              //         leaderID: "A",
              //         votes: [false, false, false, true, true],
              //         approved: true,
              //       },
              //       {leaderID: "B", votes: []},
              //       {leaderID: "C", votes: []},
              //       {leaderID: "D", votes: []},
              //       {leaderID: "E", votes: []},
              //     ],
              //   },
              //   {
              //     teamSize: 3,
              //     failsReq: 1,
              //     voting: [
              //       {
              //         leaderID: "A",
              //         votes: [true, true, true, true, true],
              //       },
              //       {leaderID: "B", votes: []},
              //       {leaderID: "C", votes: []},
              //       {leaderID: "D", votes: []},
              //       {leaderID: "E", votes: []},
              //     ],
              //   },
              //   {
              //     teamSize: 3,
              //     failsReq: 2,
              //   },
              //   {
              //     teamSize: 3,
              //     failsReq: 1,
              //   },
              // ]}
              // questIdx={2}
              // voteIdx={1}
              // players={[
              //   {user: {id: "A"}},
              //   {user: {id: "B"}},
              //   {user: {id: "C"}},
              //   {user: {id: "D"}},
              //   {user: {id: "E"}},
              // ]}
            />
          )}
        </MainLayout>
      )}

      {["evilWinsByRejections", "evilWinsByQuestFails"].includes(gameState) && (
        <Overlay>
          <div
            style={{
              display: "flex",
              flexFlow: "column noWrap",
              alignItems: "center",
            }}
          >
            <h2 style={{color: "white"}}>
              <em>
                {
                  {
                    evilWinsByRejections:
                      "Loyal eyes clouded by paranoia cannot see a way forward.",
                    evilWinsByQuestFails:
                      "Traitors of the crown have sabotaged the mission.",
                  }[gameState]
                }
              </em>
              <p>Mordred's dark forces triumph!</p>
            </h2>
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
