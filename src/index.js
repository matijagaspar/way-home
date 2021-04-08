// import wsAgent from "./utils/ws_agent";
import server from "./server";
import yargs from "yargs";
import chalk from "chalk";
import client from "./client";
import path from "path";
import getLogger, { setLevel } from "./utils/logger";

import {
  configTemplate as serverConfigTemplate,
  initServerPersistence,
} from "./utils/server_persistence";
import {
  configTemplate as clientConfigTemplate,
  initClientPersistence,
} from "./utils/client_persistence";
import {
  ValidationError,
  generateInitialFile,
} from "./utils/file_config_factory";
//todo other initing stuff
const log = getLogger();

if(process.env.NODE_ENV === 'production'){
  process.on('uncaughtException', function(err) {
    log.fatal(err)
    process.exit(1)
  });
}


log.debug(`Starting in ${process.env.NODE_ENV} mode`);

let yargOpts = yargs
  .command("client", "start client")
  .command("server", "start server")
  .demandCommand()
  .help()
  // .strict(true)
  // .strictCommands(false)

if (yargOpts.argv._.includes("server")) {
  //automattically includes next in production
  yargOpts = yargOpts.option("skip-next", {
    description: "skip starting nextjs, webapp will not work",
    type: "boolean",
  });
  yargOpts = yargOpts.option("server-config-file", {
    description: "specify server config file path",
  });
  yargOpts = yargOpts.option("create-server-config", {
    description: "Crete an empty server config file",
    type: "boolean",
  });

  const configPath = yargOpts.argv["server-config-file"] || "./server_db.json";

  if (yargOpts.argv.createServerConfig) {

    try{
      generateInitialFile(configPath, clientConfigTemplate);
      console.log(`Created server config: ${path.resolve(configPath) } `)
      process.exit(0)
    }catch(e){
      console.log(`${e.constructor.name}: Server config failed ${e.message}`)
      process.exit(1)
    }
  }

  try {
    initServerPersistence(configPath);
  } catch (e) {
    yargOpts.showHelp("log");
    if (e instanceof ValidationError) {
      console.log("Invalid server config file: ");
    }
    console.log(e.message);
    process.exit(1);
  }

  server(!yargOpts.argv.skipNext).then(() => {});
}

if (yargOpts.argv._.includes("client")) {
  yargOpts = yargOpts.option("client-config-file", {
    description: "specify client config file path",
  });
  yargOpts = yargOpts.option("create-client-config", {
    description: "Crete an empty client config file",
    type: "boolean",
  });

  const configPath =
    yargOpts.argv["client-config-file"] || "./agent_settings.json";

  if (yargOpts.argv.createClientConfig) {
    try{
      generateInitialFile(configPath, clientConfigTemplate);
      console.log(`Created client config: ${path.resolve(configPath) } `)
      process.exit(0)
    }catch(e){
      console.log(`${e.constructor.name}: Client config failed ${e.message}`)
      process.exit(1)
    }
  }
  try {
    initClientPersistence(configPath);
  } catch (e) {
    yargOpts.showHelp("log");
    if (e instanceof ValidationError) {
      console.log("Invalid client config file: ");
    }
    console.log(e.message);
    process.exit(1);
  }

  client();
}

if(process.env.NODE_ENV !== 'production'){
  yargOpts.command("mock", "start mock apps")
  if (yargOpts.argv._.includes("mock")) {
    require('./mock').default()
  }
}