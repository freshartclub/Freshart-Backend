const { createClient } = require("redis");

// const { createLog } = require('../functions');
// const errorLog = createLog('error_log');

const client = createClient({
	url: process.env.REDIS_URI,
});

(async () => {
	client.on("error", (err) => console.log("Redis Client Error", err));
	client.on("connect", () => console.log("Redis Connected"));

	await client.connect();
})();

module.exports = {
	disconnect: function () {
		client.quit();
	},
	/**
	 * This function is used to store object in redis
	 * @param {String} redisKey
	 * @param {Object} value
	 * @param {Integer} expiry time in munutes, optional params
	 * @returns Integer
	 */
	hSet: function (redisKey, value, expiry = null) {
		return new Promise(async (resolve, reject) => {
			try {
				//create array from object
				let resultArray = JSON.stringify(value)
					.slice(1, -1)
					.replace(/["]/g, "")
					.split(/[,:]+/);
				//store data in redis
				let response = await client.HSET(redisKey, resultArray);
				//set expiry if found
				if (expiry) {
					await client.EXPIRE(redisKey, expiry * 60);
				}
				resolve(response);
			} catch (error) {
				reject(error);
			}
		});
	},
	/**
	 * This function is used for get specific field of key
	 * @param {String} redisKey
	 * @param {String} key
	 * @returns String
	 */
	hGet: function (redisKey, key) {
		return new Promise(async (resolve, reject) => {
			try {
				//get data from redis
				let response = await client.HGET(redisKey, key);
				resolve(response);
			} catch (error) {
				reject(error);
			}
		});
	},
	/**
	 * This function is used for get all field of key
	 * @param {String} redisKey
	 * @returns Object
	 */
	hGetAll: function (redisKey) {
		return new Promise(async (resolve, reject) => {
			try {
				//get data from redis
				let response = await client.HGETALL(redisKey);
				resolve(response);
			} catch (error) {
				reject(error);
			}
		});
	},
	/**
	 * Function is used to store array in redis
	 * @param {String} redisKey
	 * @param {Array} value
	 * @param {Integer} expiry
	 * @returns
	 */
	sAdd: function (redisKey, value, expiry = null) {
		return new Promise(async (resolve, reject) => {
			try {
				//store data in redis
				let response = await client.SADD(redisKey, value);
				//set expiry if found
				if (expiry) {
					await client.EXPIRE(redisKey, expiry * 60);
				}
				resolve(response);
			} catch (error) {
				reject(error);
			}
		});
	},
	/**
	 * Function is used to remove the value from array in redis
	 * @param {String} redisKey
	 * @param {Array} value
	 * @param {Integer} expiry
	 * @returns
	 */
	sRem: function (redisKey, value, expiry = null) {
		return new Promise(async (resolve, reject) => {
			try {
				//remove the data in redis
				let response = await client.SREM(redisKey, value);
				//set expiry if found
				if (expiry) {
					await client.EXPIRE(redisKey, expiry * 60);
				}
				resolve(response);
			} catch (error) {
				reject(error);
			}
		});
	},
	/**
	 * Get array from redis
	 * @param {String} redisKey
	 * @returns
	 */
	sMembers: function (redisKey) {
		return new Promise(async (resolve, reject) => {
			try {
				//store data in redis
				let response = await client.SMEMBERS(redisKey);
				resolve(response);
			} catch (error) {
				reject(error);
			}
		});
	},

	del: function (redisKey) {
		return new Promise(async (resolve, reject) => {
			try {
				//store data in redis
				let response = await client.DEL(redisKey);
				resolve(response);
			} catch (error) {
				reject(error);
			}
		});
	},

	hDel: function (redisKey, field) {
		return new Promise(async (resolve, reject) => {
			try {
				//store data in redis
				let response = await client.HDEL(redisKey, field);
				resolve(response);
			} catch (error) {
				reject(error);
			}
		});
	},

	//This command sets the value at the specified key
	set: function (redisKey, value) {
		return new Promise(async (resolve, reject) => {
			try {
				//store data in redis
				let response = await client.SET(redisKey, value);
				resolve(response);
			} catch (error) {
				reject(error);
			}
		});
	},

	//Redis GET command is used to get the value stored in the specified key
	get: function (redisKey) {
		return new Promise(async (resolve, reject) => {
			try {
				//store data in redis
				let response = await client.GET(redisKey);
				resolve(response);
			} catch (error) {
				reject(error);
			}
		});
	},

	//Redis HINCRBY command is used to increment the number stored at the field in the hash
	hIncrBy: function (redisKey, key, value) {
		return new Promise(async (resolve, reject) => {
			try {
				//store data in redis
				let response = await client.HINCRBY(redisKey, key, value);
				resolve(response);
			} catch (error) {
				reject(error);
			}
		});
	},

	// Redis INCR command is used to increment the integer value of a key by one
	incr: function (redisKey) {
		return new Promise(async (resolve, reject) => {
			try {
				//store data in redis
				let response = await client.INCR(redisKey);
				resolve(response);
			} catch (error) {
				reject(error);
			}
		});
	},

	// Redis HMGET command is used to get the values associated with the specified fields in the hash stored at the key.
	hmGet: function (redisKey, fieldArray) {
		return new Promise(async (resolve, reject) => {
			try {
				//store data in redis
				let response = await client.HMGET(redisKey, fieldArray);
				resolve(response);
			} catch (error) {
				reject(error);
			}
		});
	},

	/**
	 * Function is used to store sorted set in redis
	 * @param {String} redisKey
	 * @param {Object} value {  score: 0. value: 'xyz' }
	 * @param {Integer} expiry
	 * @returns
	 */
	zAdd: function (redisKey, value, expiry = null) {
		return new Promise(async (resolve, reject) => {
			try {
				//store data in redis
				const response = await client.ZADD(redisKey, value);
				//set expiry if found
				if (expiry) {
					await client.EXPIRE(redisKey, expiry * 60);
				}
				resolve(response);
			} catch (error) {
				reject(error);
			}
		});
	},

	/**
	 * Function is used to increase score by x amount of specific member in sorted set
	 * @param {String} redisKey
	 * @param {String} member
	 * @param {Integer} increment
	 * @returns
	 */
	zIncrBy: function (redisKey, member, increament = 1) {
		return new Promise(async (resolve, reject) => {
			try {
				const response = await client.ZINCRBY(redisKey, increament, member);
				resolve(response);
			} catch (error) {
				reject(error);
			}
		});
	},

	/**
	 * Function is used to get sorted set members as per given range of score
	 * @param {String} redisKey
	 * @param {Integer} min
	 * @param {Integer} max
	 * @returns
	 */
	zRange: function (redisKey, min = 0, max = Number.MAX_SAFE_INTEGER) {
		return new Promise(async (resolve, reject) => {
			try {
				const response = await client.ZRANGE(redisKey, min, max);
				resolve(response);
			} catch (error) {
				reject(error);
			}
		});
	},

	/**
	 * Function is used to get sorted set members with score as per given range of score
	 * @param {String} redisKey
	 * @param {Integer} min
	 * @param {Integer} max
	 * @returns
	 */
	zRangeWithScore: function (redisKey, min = 0, max = Number.MAX_SAFE_INTEGER) {
		return new Promise(async (resolve, reject) => {
			try {
				const response = await client.ZRANGE_WITHSCORES(redisKey, min, max);
				resolve(response);
			} catch (error) {
				reject(error);
			}
		});
	},

	/**
	 * Function is used to remove member from sorted set
	 * @param {String} redisKey
	 * @param {String} member
	 * @returns
	 */
	zRem: function (redisKey, member) {
		return new Promise(async (resolve, reject) => {
			try {
				const response = await client.ZREM(redisKey, member);
				resolve(response);
			} catch (error) {
				reject(error);
			}
		});
	},

	// Function is used to add member at first position in redis list dataset
	lAddFirst: function (key, member) {
		return new Promise(async (resolve, reject) => {
			try {
				const response = await client.LPUSH(key, member.toString());
				resolve(response);
			} catch (error) {
				reject(error);
			}
		});
	},

	// Function is used to add member at last position in redis list dataset
	lAddLast: function (key, member) {
		return new Promise(async (resolve, reject) => {
			try {
				const response = await client.RPUSH(key, member.toString());
				resolve(response);
			} catch (error) {
				reject(error);
			}
		});
	},

	// Function is used to remove member at first position in redis list dataset
	lRemoveFirst: function (key) {
		return new Promise(async (resolve, reject) => {
			try {
				const response = await client.LPOP(key);
				resolve(response);
			} catch (error) {
				reject(error);
			}
		});
	},

	// Function is used to remove member at last position in redis list dataset
	lRemoveLast: function (key) {
		return new Promise(async (resolve, reject) => {
			try {
				const response = await client.RPOP(key);
				resolve(response);
			} catch (error) {
				reject(error);
			}
		});
	},

	// Function is used to get members by range stored in redis list dataset, default it will return all members
	lGetMembersByRange: function (key, start = 0, end = Number.MAX_SAFE_INTEGER) {
		return new Promise(async (resolve, reject) => {
			try {
				const response = await client.LRANGE(key, start, end);
				resolve(response);
			} catch (error) {
				reject(error);
			}
		});
	},

	// Function is used to move member at last position in redis list dataset
	lMoveMemberAtLast: function (key, value) {
		return new Promise(async (resolve, reject) => {
			try {
				const member = await client.LREM(key, 0, value.toString());
				const response = await this.lAddLast(key, value.toString());
				resolve(response);
			} catch (error) {
				reject(error);
			}
		});
	},

	// Function is used to remove member by value in redis list dataset
	lRemoveByValue: function (key, value) {
		return new Promise(async (resolve, reject) => {
			try {
				const response = await client.LREM(key, 0, value.toString());
				resolve(response);
			} catch (error) {
				reject(error);
			}
		});
	},

	// Function is used to add multiple members from end in redis list dataset
	lAddMultipleAtLast: function (key, members = []) {
		return new Promise(async (resolve, reject) => {
			try {
				const response = await client.RPUSH(
					key,
					members.map((member) => member.toString())
				);
				resolve(response);
			} catch (error) {
				reject(error);
			}
		});
	},

	// Function is used to add members at last of the list only if not exists
	lAddLastIfNotExists: function (key, member) {
		return new Promise(async (resolve, reject) => {
			try {
				const index = await client.LPOS(key, member.toString());
				if (index >= 0) {
					return resolve();
				}
				const response = await client.RPUSH(key, member);
				resolve(response);
			} catch (error) {
				reject(error);
			}
		});
	},
};
