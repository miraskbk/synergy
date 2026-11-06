import {WebSocketServer} from 'ws'


const wss = new WebSocketServer({port: 8080})

wss.on('connection', (ws) => {
    console.log("client connected");

    ws.on('message', (message) => {
        console.log(`Received: ${message}`)

        for(const client of wss.clients){
            if(client.readyState === 1){
                client.send(`${message}`)
            }
        }
    });

    ws.on('close', () => console.log("cliend disconnected"));

});


console.log('listening on ws://localhost:8080');
