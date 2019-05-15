const os = require('os');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const YAML = require('js-yaml');

function getTmpDirPath() {
  return path.join(os.tmpdir(),
      'tmpdirs-serverless', crypto.randomBytes(8).toString('hex'));
}

function getTmpFilePath(fileName) {
  return path.join(getTmpDirPath(), fileName);
}

function replaceTextInFile(filePath, subString, newSubString) {
  const fileContent = fs.readFileSync(filePath).toString();
  fs.writeFileSync(filePath, fileContent.replace(subString, newSubString));
}

function readYamlFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return YAML.safeLoad(content);
}

function writeYamlFile(filePath, content) {
  const yaml = YAML.safeDump(content);
  fs.writeFileSync(filePath, yaml);
  return yaml;
}

module.exports = {
  getTmpDirPath,
  getTmpFilePath,
  replaceTextInFile,
  readYamlFile,
  writeYamlFile,
};
