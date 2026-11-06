import {WebSocketServer} from 'ws'


const wss = new WebSocketServer({port: 8080})

function broadcast(obj){
        for(const client of wss.clients){
            if(client.readyState === 1){
                client.send(JSON.stringify(obj))
            }
        }
    }
wss.on('connection', (ws) => {
    console.log("client connected");

    ws.on('message', (message) => {
    let msg;
    try{
        msg = JSON.parse(message.toString());
    }catch{
        return;
    }

    if(msg.type === 'join'){
        if(typeof msg.user !== 'string') return;
        ws.user = msg.user
        broadcast({type: 'system', text:`${ws.user} joined`});
        return;
    }

    if(msg.type !== 'chat') return
    if(typeof msg.user !== 'string') return
    if(typeof msg.text !== 'string') return


    console.log(`${msg.user}: ${msg.text}`)
    broadcast(msg);

    });

    ws.on('close', () => {
        console.log('cliend disconnected')
        if(ws.user)
            broadcast({type: 'system', text:`${ws.user} left`});
    })

});


console.log('listening on ws://localhost:8080');
