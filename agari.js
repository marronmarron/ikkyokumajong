function createAgari(agari) {
    // agari.yaku = computeYaku();
    // agari.fu = computeFu();
    // agari.ten = computeTen();

    // TODO 符計算/役計算/点数計算
    agari.fu = 40;
    agari.yaku = [
        {name: "リーチ", han: 1},
        {name: "タンヤオ", han: 1},
        {name: "ドラ", han: 1},
    ];
    agari.ten = [-5200, 0, 0, 5200];

    return agari;
}

module.exports = createAgari;