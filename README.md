# Synergy

A terminal chat for developers to talk about the code they are working on, right next to it.

## Join a Synergy server

You need Node.js 22 or newer and a GitHub account. Ask the server owner to add your GitHub login
to the server's allowed users first.

```bash
git clone https://github.com/miraskbk/synergy.git
cd synergy
npm install
npm run chat -- login   # opens a GitHub code to approve in your browser
npm run chat            # connects to wss://synergy-dv3z.onrender.com
```

## In the chat

| Type                           | What happens                              |
| ------------------------------ | ----------------------------------------- |
| any text                       | sends a chat message                      |
| `/share path/to/file.js:10-20` | shares lines 10–20 of a file on your disk |
| `/share path/to/file.js:10`    | shares one line                           |
| `/share path/to/file.js`       | shares the whole file                     |
| `/diff`                        | shares all your uncommitted changes       |
| `/diff path/to/file.js`        | shares the changes in one file or folder  |
| `/quit`                        | leaves                                    |

File paths are relative to the folder you started the chat in.

## Run your own server locally

```bash
npm run dev          # server on ws://localhost:8080, restarts on changes
npm run chat:local   # connect to it
npm test
```

Set `ALLOWED_USERS=login1,login2` to only let those GitHub users in. Without it, anyone with a
GitHub account can join.
