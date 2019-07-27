const _ = require('lodash');

module.exports = io => {
    // サーバー側処理のエントリポイント
    let current_room_id = 0;

    io.on('connection', async socket => {
        const room_id = current_room_id;
        const room_name = 'room_'+room_id;

        console.log(socket.id);

        socket.join(room_name);
        const clients = await getClientsPromise(io.in(room_name));
        if(clients.length === 4) {
             gameStart(io, room_name, clients);
            current_room_id++;
        }
    });
};

function gameStart(io, name, clients) {
    console.log("GAME START "+name);
    let yama = createYama();
    _.forEach(clients, (id => io.to(id).emit('haipai', haipai(yama))));

    let turn = 0;
    io.to(name).emit('tsumo', yama.pop());

    io.to(clients[turn]).on('dahai', function(dahai) {
        console.log(dahai);
        socket.emit('tsumo', yama.pop());
    });

    io.on('restart', () => {
        gameStart(io, name, clients);
    });
}

async function getClientsPromise(namespace) {
    return new Promise((resolve, reject) => {
        namespace.clients((err, clients) => {
            if (err) reject(err);
            else resolve(clients);
        });
    });
}

function haipai(yama) {
    const tehai = [];
    _.times(13, () => {tehai.push(yama.pop())});
    return tehai;
}

function createYama() {
    return _.shuffle([...Array(136).keys()]);
}