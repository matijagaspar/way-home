# way-home

`way-home` is a websocket based reverse proxy with google auth. The main purpose is to make home running servercies (iot, web-UI of apps,...) accessible from a public address with security in mind and no need to expose internal network directly to the outside world (punches practically any nat).

## How it works

The solution is in 2 parts a server and a agent client.

### Agent Client
It is a the program that needs to run on the "home" network. It connects (after authorization) to the server with a websocket, and sends the configured forwarded "web apps" to the server which will handle the routing.

### Server 
Needs to run on a publicly accessible address. It handles all connections and routing, and authentication, and runs a small web ui for user managment and links. When you access the the server web app, you will first have to log in (be sure to add your email to the config). Then depending on the permissions set on the agent client it will list the "apps". The "apps" are accessed by going to `[app-id].your-server-domain.tld` if you are logged in (session created), the server will proxy the requests to the target port on the agent.

## Set up

### Prerequisites
* A hosting server able to run node (ie: aws, gce, bare metal) with open 433 port(plain http is not advised, should be https).
* A direct and wildcard domain pointing to the hosting server (proxy.mydomain.tld and *.proxy.mydomain.tld)
* HTTPS reverse proxy (nginx, ALB, ...)
* HTTPS Certificate for wildcard and direct domain (ie: proxy.mydomain.tld and *.proxy.mydomain.tld)
* Some sort of process/service manager on the hosting machine to keep the service running (ie: supervisor, pm2, systemd, ...)
* Set up a google oauth in google console. Allowed callback should be: `https://[domain]/googleCallback`

### Setting up the server
* Install the package `npm install -g way-home`
* Create config in the desired folder `way-home server --create-server-config` (it will create a blank configuration )
* edit the configuration (see: server configuration)
* set up the a service managment to run `way-home server` in the directory you created the config or use `--server-config-file=[path-to-config]`
* set up your https revese proxy to point to the port of the server
* Check if everything works by connecting to the domain


### Setting up the client agent
* Install the package `npm install -g way-home`
* Create config in the desired folder `way-home client --create-client-config` (it will create a blank configuration )
* edit the configuration (see: client configuration)
* set up the a service managment to run `way-home client` in the directory you created the config or use `--client-config-file=[path-to-config]`

## Configuration
### Server

```js
{
  "config": {
    "contoller_domain": "myproxy.example.com", // The domain your server is accessible on
    "controller_listen_port": 8080, // the port the server is listening to (the one you point your reverse proxy to.)
    "isSSL": true,  // if you are using https (you should be)
    "controller_public_url": "https://myproxy.example.com/" // the public url of the controller
  },
  "google_api": {
    "clientID": "GOOGLE_CLIENT_ID", // google oauth client id
    "clientSecret": "GOOGLE_CLIENT_SECRET", // google oauth client secret
    "callbackURL": "https://myproxy.example.com/googleCallback" // callback url, should be controller_public_url+googleCallback
  },
  "users": [ //list of users
    {
      "email": "my.email@gmail.com", // user email
      "groups": [   // list of groups the user belongs to
        "admin"
      ]
    }
  ],
  "domains": [ // google workspace domain
    {
      "domain": "@customdomain.com", //domain including @
      "groups": [
        "customdomain"  // list of groups assigned to the workspace domain
      ]
    }
  ],
  "user_groups": [ // list of valid groups
    "admin",
    "super-user",
    "customdomain"
  ],
  "authorized_agents": [] // list of authorized agents, do not edit, managed automatically
}
```

### Client
```js
{
  "agent_name": "myAgentName", //name of the agent, should be unique
  "controller_address": "myproxy.example.com", // address of the server 
  "isSsl": true, // server on ssl (it should)
  "permissions": { // general permissions for all apps defined in this agent
    "mode": "session", //authentication mode can be session, basic, or open
    "groups": [ //which groups can access, can be specific users see demo_app1
      "admin",
      "myAgentName"
    ]
  },
  "apps": [ //list of apps
    {
      "app_id": "demo_app1", // id of the app, needs to be globally unique
      "remote_port": 3003, // port of the app
      "name": "Demo 1", // Label of the app
      "remote_host": "localhost", //address to the app from agent (local ip, localhost, ...)
      "color": "red", //color of the app, can be css hex (ie: #ffffff)
      "icon": "[url_to_icon]", //url to the app icon
      "permissions": {
          "users": {
              "myemail@gmail.com": true //specific user that has access
          }
      }
    },
    {
      "app_id": "demo_app2",
      "remote_port": 3003,
      "name": "MySuperApp",
      "remote_host": "localhost",
      "permissions": {
        "mode":"basic", // example of basic permission
        "users":{
          "tester":"test" // username : password
        }
      }
    }
  ],
  "authorization_key": "" //automatically managed
}
```
## Development

For development the main thing is you wil have to edit your hosts file to make it work in development. Pick some domain and point it to localhost, use that domain in config files. For development just use `isSsl: false`. To start the development use `yarn dev server` and `yarn dev client`. Can be run in the same command too: `yarn dev server client`. The dev env is set up in such a way that modification will trigger re-compile and restart. For faster restarts if you are only working on the websocket router you can skip nextjs by `yarn dev server --skip-next`

## Security considerations
First and foremost, your server should use https, otherwise the communication between agent and server will be vulnerable to MIM. Whenever possible use `session` mode, using basic or open should be considered unsecure. To make everything work, there are some direct http request parsing, which although in most cases should be ok there might be some flaw that I have missed. Agent configuration contains a authentication key that is used to authenticate the agent with the server. It should be considered very sensitive, if "stolen" one could attempt to spoof an agent, but since only one agent with same id can be connected, they will be disconnecting eachother, should be easily noticable from logs. For basic auth, the password is stored on the client config in clear text. As mentioned before basic should be considered unsafe, but when I have some time I will update to store a hashed value.

### Disclamer
This was a hobby project of mine from few years ago, that I decided to make public. I have updated the majority of the libs but there is still cleanup to do. There might be some major flaws that I have failed to notices, use at your own risk. It obviusly comes with no warranty or anything of sorts. There are still some bits needing of cleaning.


