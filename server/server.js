import {WebSocketServer} from 'ws'


const wss = new WebSocketServer({port: 8080})

wss.on('connection', (ws) => {
    console.log("client connected");

    ws.on('message', (message) => {
    let msg;
    try{
        msg = JSON.parse(message.toString());
    }catch{
        return;
    }

    if(msg.type !== 'chat') return
    if(typeof msg.user !== 'string') return
    if(typeof msg.text !== 'string') return


    console.log(`${msg.user}: ${msg.text}`)

        for(const client of wss.clients){
            if(client.readyState === 1){
                client.send(`${message}`)
            }
        }
    });

    ws.on('close', () => console.log("cliend disconnected"));

});


console.log('listening on ws://localhost:8080');
