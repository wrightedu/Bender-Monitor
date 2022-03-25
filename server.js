const http = require('http')
const fs = require('fs')
const WebSocketServer = require('ws').Server;
const spawn = require('child_process').spawn;



const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    fs.createReadStream('index.html').pipe(res);
});

server.listen(process.env.PORT || 3000);

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

// create a function and set it to run every 10 seconds
setInterval(()=>{
    console.log('Sending update');

    // Run `ps -aux` and get the five processes that are using the most ram
    var child = spawn('sh', ['-c', 'ps aux --sort -rss | head -n6 | tail -n5']);

    child.stdout.setEncoding('utf-8');

    var output = '';
    child.stdout.on('data', data=>{
        // console.log('Got some data: ' + data)
        data = data.toString();
        output += data;
    });

    let processes = [];

    child.stdout.on('close', exitCode=>{
        let lines = output.split('\n');
        lines.pop();
        lines.forEach(i=>{
            let cols = i.split(/\s+/);
            // console.log(`Process ${cols[10]} is using ${(cols[5] / 1024).toFixed(0)}MB`);
            processes.push({'name': cols[10], 'mem': (cols[5] / 1024).toFixed(0)});
        });

        // Send the data to each client
        clients.forEach(i=>{
            i.send(JSON.stringify(processes));
        });
    });
}, 1000);