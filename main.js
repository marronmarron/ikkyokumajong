const _ = require('lodash');

module.exports = io => {
    // サーバー側処理のエントリポイント
    const yama = _.shuffle([...Array(136).keys()]);

    io.on('connection', socket => {
        console.log("user connected");
        console.log(haipai(yama));
        socket.emit('haipai', haipai(yama));
        socket.on('dahai', function(dahai) {
            console.log(dahai);
            socket.emit('tsumo', yama.pop());
        });
    });
};

function haipai(yama) {
    const tehai = [];
    _.times(13, () => {tehai.push(yama.pop())});
    return tehai;
}