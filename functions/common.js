module.exports.createLog = (logName) => {
	try {
		return require("simple-node-logger").createRollingFileLogger({
			logDirectory: "logs", // NOTE: folder must exist and be writable...
			fileNamePattern: logName + "_<DATE>.log",
			dateFormat: "YYYY_MM_DD",
			timestampFormat: "YYYY-MM-DD HH:mm:ss",
		});
	} catch (error) {
		throw error;
	}
};
