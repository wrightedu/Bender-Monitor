const http = require('http')
const fs = require('fs')
const WebSocketServer = require('ws').Server;
const spawn = require('child_process').spawn;



const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    fs.createReadStream('index.html').pipe(res);
});

server.listen(process.env.PORT || 3000);



// ############################################
// #####         WEB SOCKET STUFF         #####
// ############################################



const wss = new WebSocketServer({ port: 8080});
var clients = [];

wss.on('connection', ws=>{
    console.log('Client connected');
    clients.push(ws);

    ws.on('message', data=>{
        console.log(data);
    });

    ws.on('close', ()=>{
        console.log('Client disconnected');
        clients.splice(clients.indexOf(ws), 1);
    });

    // log errors
    ws.on('error', err=>{
        console.log(err);
    });
});

console.log('websocket server started on localhost:8080');

function sendData(data_type, data) {
    clients.forEach(client=>{
        client.send(JSON.stringify({
            type: data_type,
            timestamp: Date.now(),
            data: data
        }));
    });
}

async function getMemUsage() {
    var child = spawn('free');
    child.stdout.setEncoding('utf8');

    var stdout = '';

    child.stdout.on('data', data=>{
        stdout += data.toString();
    });

    return new Promise(resolve=>{
        child.stdout.on('close', exit_code=>{
            var lines = stdout.split('\n');
            var mem_usage = Number(lines[1].split(/\s+/)[2]);
            var swap_usage = Number(lines[2].split(/\s+/)[2]);
            resolve({
                mem_usage: mem_usage,
                swap_usage: swap_usage
            });
        });
    });
}

async function getCPUUsage() {
    // We want to do ps -A -o pcpu | tail -n+2 | paste -sd+ | bc without pipes
    var child = spawn('ps', ['-A', '-o', 'pcpu']);
    child.stdout.setEncoding('utf8');
    var stdout = '';

    child.stdout.on('data', data=>{
        stdout += data.toString();
    });

    return new Promise(resolve=>{
        child.stdout.on('close', exit_code=>{
            var lines = stdout.split('\n');
            var cpu_usage = 0;
            for (var i = 1; i < lines.length; i++) {
                cpu_usage += Number(lines[i]);
            }
            resolve(cpu_usage);
        });
    });
}

async function getUsers() {
    // Discard the first two lines, then add the first word from the rest of the lines into an array to return
    var child = spawn('w');
    child.stdout.setEncoding('utf8');
    var stdout = '';

    child.stdout.on('data', data=>{
        stdout += data.toString();
    });

    return new Promise(resolve=>{
        child.stdout.on('close', exit_code=>{
            var lines = stdout.split('\n');
            lines.pop()
            var users = [];
            for (var i = 2; i < lines.length; i++) {
                users.push(lines[i].split(/\s+/)[0]);
            }
            resolve(users);
        });
    });
}


// create a function and set it to run every 10 seconds
setInterval(()=>{
    console.log('Sending update');

    // get the memory usage
    getMemUsage().then(data=>{
        // TODO: Check to see if there's any alert- or log-worthy memory data
        sendData('mem-usage', data.mem_usage);
        sendData('swap-usage', data.swap_usage);
    });

    // get the cpu usage
    getCPUUsage().then(data=>{
        sendData('cpu-usage', data);
    });

    // get the users
    getUsers().then(data=>{
        sendData('current-users', data);
    });
}, 1000);