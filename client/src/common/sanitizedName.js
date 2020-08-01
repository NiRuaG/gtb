const MAX_NAME_LENGTH = 20;

const noWS = require("./removeWhitespace");
const maxLength = require("./maxLength")(MAX_NAME_LENGTH);

module.exports = (str) => maxLength(noWS(str));
