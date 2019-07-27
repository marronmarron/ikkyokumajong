module.exports = function(io) {
    // サーバー側処理のエントリポイント
    console.log('hello');

    io.on('connection', function() {
        console.log("user connected");
    });
};