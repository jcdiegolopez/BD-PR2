const neo4j = require('neo4j-driver');
const logger = require('./logger');

let driver;

function getDriver() {
  if (!driver) {
    const uri = process.env.NEO4J_URI; 
    const user = process.env.NEO4J_USER;
    const password = process.env.NEO4J_PASSWORD;
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
      disableLosslessIntegers: true,
      maxConnectionPoolSize: 50,
    });
    logger.info('Neo4j driver inicializado', { uri: uri ? uri.replace(/:\/\/.+@/, '://***@') : null });
  }
  return driver;
}

function getSession() {
  return getDriver().session();
}

async function closeDriver() {
  if (driver) {
    await driver.close();
    driver = undefined;
  }
}

module.exports = {
  getDriver,
  getSession,
  closeDriver,
};
