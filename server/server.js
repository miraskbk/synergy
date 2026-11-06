import {WebSocketServer} from 'ws'


const wss = new WebSocketServer({port: 8080})

wss.on('connection', (ws) => {
    console.log("client connected");

    ws.on('message', (message) => {
        console.log(`Received: ${message}`)

        ws.send(`Server received: ${message}`);
    });

    ws.on('close', () => console.log("cliend disconnected"));

});


console.log('listening on ws://localhost:8080');
