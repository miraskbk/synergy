import { WebSocketServer, WebSocket } from "ws"; 
import { randomUUID } from 'node:crypto'


const PORT = Number(process.env.PORT) || 8080
const MAX_NAME_LENGTH = 32
const MAX_TEXT_LENGTH = 4000

const wss = new WebSocketServer({port: PORT, maxPayload: 16 * 1024})


function broadcast(obj){
    const data = JSON.stringify(obj)

    for(const client of wss.clients){
        if(client.readyState === WebSocket.OPEN){
            client.send(data)
        }
    }
}


function sendError(ws, text){
    ws.send(JSON.stringify({type: 'error', text}))
}



function isNameTaken(name){
    for(const client of wss.clients){
        if(client.user === name){
            return true
        }
        
    }
    return false
}

function handleJoin(ws,msg){
    if(ws.user) return sendError(ws, 'already joined')
    if(typeof msg.user !== 'string') return sendError(ws, 'user must be a string')


    const name = msg.user.trim()
    if(name.length === 0 || name.length > MAX_NAME_LENGTH){
        return sendError(ws, `name must be 1 - ${MAX_NAME_LENGTH} characters`)
    } 

    if(isNameTaken(name)) return sendError(ws, 'name already taken')

    ws.user = name
    broadcast({type: 'system', id: randomUUID(), ts: Date.now(), text: `${name} joined`})
}


function handleChat(ws,msg){
    if(!ws.user) return sendError(ws, 'join first')
    if(typeof msg.text !== 'string') return sendError(ws, 'text must be a string')
    if(msg.text.trim().length === 0) return sendError(ws, 'message is empty')
    if(msg.text.length > MAX_TEXT_LENGTH) {
        return sendError(ws, `message longer than ${MAX_TEXT_LENGTH} characters`)
    }


    broadcast({
        type: 'chat',
        id: randomUUID(),
        ts: Date.now(),
        user: ws.user,
        text: msg.text,
    })
}



const handlers = new Map(
    [
        ['join', handleJoin],
        ['chat', handleChat],
    ]
    
)



wss.on('connection', (ws) => {
    console.log('client connected')

    ws.on('message', (data) => {
        let msg
        try{
            msg = JSON.parse(data.toString())
        } catch{
            return sendError(ws, 'invalid JSON')
        }

        if(typeof msg !== 'object' || msg === null || Array.isArray(msg)){
            return sendError(ws, 'message must be a JSON object')
        }

        const handler = handlers.get(msg.type)
        if(!handler) return sendError(ws, `unknown message type: ${msg.type}`)

        handler(ws,msg)
    })

    ws.on('close', () => {
        console.log('client disconnected')

        if(ws.user){
            broadcast({type: 'system', id: randomUUID(), ts: Date.now(), text: `${ws.user} left`})
        }
    })
})

console.log(`listening on ws://localhost:${PORT}`)

