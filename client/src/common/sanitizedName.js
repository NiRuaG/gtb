const MAX_NAME_LENGTH = 12;

const lettersOnly = require("./lettersOnly");
const maxLength = require("./maxLength")(MAX_NAME_LENGTH);

module.exports = (str) => maxLength(lettersOnly(str));
