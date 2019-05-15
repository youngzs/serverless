const AWS = require('aws-sdk');

function createRestApi(name) {
  const APIG = new AWS.APIGateway({ region: 'us-east-1' });

  const params = {
    name,
  };

  return APIG.createRestApi(params).promise();
}

function deleteRestApi(restApiId) {
  const APIG = new AWS.APIGateway({ region: 'us-east-1' });

  const params = {
    restApiId,
  };

  return APIG.deleteRestApi(params).promise();
}

function getResources(restApiId) {
  const APIG = new AWS.APIGateway({ region: 'us-east-1' });

  const params = {
    restApiId,
  };

  return APIG.getResources(params).promise()
    .then((data) => data.items);
}

module.exports = {
  createRestApi,
  deleteRestApi,
  getResources,
};
