module.exports = (arr) => {
  const {length} = arr;
  for (let i = 0; i < length - 1; ++i) {
    const j = Math.floor(Math.random() * (length - i)) + i;
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
};
