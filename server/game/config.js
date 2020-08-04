const MIN_PLAYERS = 5;
const MAX_PLAYERS = 10;
const canStart = (coll) =>
  coll != null &&
  (coll.length || coll.size) >= MIN_PLAYERS &&
  (coll.length || coll.size) <= MAX_PLAYERS;

module.exports = {
  MIN_PLAYERS,
  MAX_PLAYERS,
  canStart,
};
