module.exports = function(io) {
    // サーバー側処理のエントリポイント
    io.on('connection', function(socket) {
        console.log("user connected");
        socket.on('dahai', function(dahai) {
            console.log(dahai);
            socket.emit('tsumo', 1);
        });
    });
};