const { createLog } = require("./common");
const APIErrorLog = createLog("API_error_log");

module.exports = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      APIErrorLog.error(err);
      if (err.name === "ValidationError") {
        const firstErrorField = Object.keys(err.errors)[0];
        const errorMessage = err.errors[firstErrorField].message;
        return res.status(400).send({ message: errorMessage });
      } else {
        return res.status(500).send({ message: "Something went wrong" });
      }
    }
  };
};
