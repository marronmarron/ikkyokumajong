const _ = require('lodash');

module.exports = io => {
    // サーバー側処理のエントリポイント
    let yama = createYama();

    io.on('connection', socket => {
        socket.emit('haipai', haipai(yama));

        socket.on('dahai', function(dahai) {
            console.log(dahai);
            socket.emit('tsumo', yama.pop());
        });

        socket.on('restart', () => {
            yama = createYama();
            socket.emit('haipai', haipai(yama));
        });
    });
};

function haipai(yama) {
    const tehai = [];
    _.times(13, () => {tehai.push(yama.pop())});
    return tehai;
}

function createYama() {
    return _.shuffle([...Array(136).keys()]);
}