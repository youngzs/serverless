'use strict';

const path = require('path');
const fse = require('fs-extra');
const execSync = require('child_process').execSync;
const BbPromise = require('bluebird');
const awsCleanup = require('./aws-cleanup');
const ServerlessPlugin = require('./plugins').ServerlessPlugin;
const installPlugin = require('./plugins').installPlugin;
const getTmpDirPath = require('./fs').getTmpDirPath;
const getTmpFilePath = require('./fs').getTmpFilePath;
const replaceTextInFile = require('./fs').replaceTextInFile;
const readYamlFile = require('./fs').readYamlFile;
const writeYamlFile = require('./fs').writeYamlFile;
const putCloudWatchEvents = require('./cloudwatch').putCloudWatchEvents;
const getCognitoUserPoolId = require('./cognito').getCognitoUserPoolId;
const createCognitoUser = require('./cognito').createCognitoUser;
const publishIotData = require('./iot').publishIotData;
const createAndRemoveInBucket = require('./s3').createAndRemoveInBucket;
const createSnsTopic = require('./sns').createSnsTopic;
const removeSnsTopic = require('./sns').removeSnsTopic;
const publishSnsMessage = require('./sns').publishSnsMessage;
const createRestApi = require('./api-gateway').createRestApi;
const deleteRestApi = require('./api-gateway').deleteRestApi;
const getResources = require('./api-gateway').getResources;

const logger = console;

const testRegion = 'us-east-1';

const serverlessExec = path.join(__dirname, '..', '..', 'bin', 'serverless');

function replaceEnv(values) {
  const originals = {};
  for (const key of Object.keys(values)) {
    if (process.env[key]) {
      originals[key] = process.env[key];
    } else {
      originals[key] = 'undefined';
    }
    if (values[key] === 'undefined') {
      delete process.env[key];
    } else {
      process.env[key] = values[key];
    }
  }
  return originals;
}

const serviceNameRegex = /integ-test-\d+/;

function getServiceName() {
  const hrtime = process.hrtime();
  return `integ-test-${hrtime[1]}`;
}

function createTestService(templateName, tmpDir, testServiceDir) {
  const serviceName = getServiceName();

  fse.mkdirsSync(tmpDir);
  process.chdir(tmpDir);

  // create a new Serverless service
  execSync(`${serverlessExec} create --template ${templateName}`, { stdio: 'inherit' });

  if (testServiceDir) {
    fse.copySync(testServiceDir, tmpDir, { clobber: true, preserveTimestamps: true });
  }

  replaceTextInFile('serverless.yml', templateName, serviceName);

  process.env.TOPIC_1 = `${serviceName}-1`;
  process.env.TOPIC_2 = `${serviceName}-1`;
  process.env.BUCKET_1 = `${serviceName}-1`;
  process.env.BUCKET_2 = `${serviceName}-2`;
  process.env.COGNITO_USER_POOL_1 = `${serviceName}-1`;
  process.env.COGNITO_USER_POOL_2 = `${serviceName}-2`;

  // return the name of the CloudFormation stack
  return serviceName;
}

function deployService() {
  execSync(`${serverlessExec} deploy`, { stdio: 'inherit' });
}

function removeService() {
  execSync(`${serverlessExec} remove`, { stdio: 'inherit' });
}

function persistentRequest() {
  const args = [].slice.call(arguments);
  const func = args[0];
  const funcArgs = args.slice(1);
  const MAX_TRIES = 5;
  return new BbPromise((resolve, reject) => {
    const doCall = (numTry) => {
      return func.apply(this, funcArgs).then(resolve, e => {
        if (numTry < MAX_TRIES &&
          ((e.providerError && e.providerError.retryable) || e.statusCode === 429)) {
          logger.log(
            [`Recoverable error occurred (${e.message}), sleeping for 5 seconds.`,
              `Try ${numTry + 1} of ${MAX_TRIES}`].join(' ')
          );
          setTimeout(doCall, 5000, numTry + 1);
        } else {
          reject(e);
        }
      });
    };
    return doCall(0);
  });
}

function getFunctionLogs(functionName) {
  const logs = execSync(`${serverlessExec} logs --function ${functionName} --noGreeting true`);
  const logsString = new Buffer(logs, 'base64').toString();
  process.stdout.write(logsString);
  return logsString;
}

module.exports = {
  // cleanup
  awsCleanup,
  // core
  logger,
  testRegion,
  serverlessExec,
  replaceEnv,
  serviceNameRegex,
  getServiceName,
  createTestService,
  deployService,
  removeService,
  getFunctionLogs,
  persistentRequest,
  // filesystem
  getTmpDirPath,
  getTmpFilePath,
  replaceTextInFile,
  readYamlFile,
  writeYamlFile,
  // plugins
  ServerlessPlugin,
  installPlugin,
  // services
  createAndRemoveInBucket: persistentRequest.bind(this, createAndRemoveInBucket),
  createSnsTopic: persistentRequest.bind(this, createSnsTopic),
  removeSnsTopic: persistentRequest.bind(this, removeSnsTopic),
  publishSnsMessage: persistentRequest.bind(this, publishSnsMessage),
  publishIotData: persistentRequest.bind(this, publishIotData),
  putCloudWatchEvents: persistentRequest.bind(this, putCloudWatchEvents),
  getCognitoUserPoolId: persistentRequest.bind(this, getCognitoUserPoolId),
  createCognitoUser: persistentRequest.bind(this, createCognitoUser),
  createRestApi: persistentRequest.bind(this, createRestApi),
  deleteRestApi: persistentRequest.bind(this, deleteRestApi),
  getResources: persistentRequest.bind(this, getResources),
};
