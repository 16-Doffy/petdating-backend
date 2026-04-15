function toClientId(doc) {
  return {
    id: doc._id.toString(),
    ...doc,
    _id: undefined,
    __v: undefined,
  };
}

module.exports = { toClientId };
