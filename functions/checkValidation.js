module.exports.checkValidations = (errors) => {
    return new Promise(async function (resolve, reject) {
      try {
           // if there is error then return Error
      if (!errors.isEmpty()) {
        return resolve({
        type: 'error',
        errors: errors.errors[0],
      });
    }
        // Resolve the process
        return resolve({
          type: 'success',
        });
      } catch (error) {
        // Reject the process
        return reject(error);
      };
    });
  };
