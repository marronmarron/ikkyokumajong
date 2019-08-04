const _ = require('lodash');
const fs = require('fs');

const mentu_tatu_map = JSON.parse(fs.readFileSync('mentu_tatu_map.json', 'utf8'));

function tehai9toInt(tehai9) {
    let value = 0;
    _.forEach(tehai9, i => {
        value *= 5;
        value += i;
    });
    return value;
}

function mtCalculate(tehai34) {
    const manzu = _.slice(tehai34, 0, 9);
    const pinzu = _.slice(tehai34, 9, 18);
    const souzu = _.slice(tehai34, 18, 27);
    const jihai = _.slice(tehai34, 27, 34);
    let mt = 0;
    mt += mentu_tatu_map[tehai9toInt(manzu)];
    mt += mentu_tatu_map[tehai9toInt(pinzu)];
    mt += mentu_tatu_map[tehai9toInt(souzu)];
    _.forEach(jihai, pai => {
        if(pai >= 3) mt += 10;
        if(pai === 2) mt++;
    });
    return mt;
}

function shantenNormal(tehai34, head_candidate, fuuro) {
    const mt = mtCalculate(tehai34);
    let shanten = 8 - 2*(fuuro+Math.floor(mt/10)) - Math.min(4-fuuro-Math.floor(mt/10), mt%10);
    _.forEach(head_candidate, head => {
        tehai34[head] -= 2;
        const mt = mtCalculate(tehai34);
        tehai34[head] += 2;
        shanten = Math.min(shanten, 7 - 2*(fuuro+Math.floor(mt/10)) - Math.min(4-fuuro-Math.floor(mt/10), mt%10));
    });
    return shanten;
}

function shantenChitoi(tehai34, head_candidate) {
    return 6 - head_candidate.length;
}

function shantenKokushi(tehai34) {
    const yaochu = [0,8,9,17,18,26,27,28,29,30,31,32,33];
    let shanten = 13;
    let head = 0;
    _.forEach(yaochu, z => {
        if(tehai34[z]) shanten--;
        if(tehai34[z]>=2) head = 1;
    });
    return shanten - head;
}

function getShanten(tehai136) {
    const fuuro = 4 - Math.floor(tehai136.length/3);
    const head_candidate = [];
    const tehai34 = Array(34).fill(0);
    _.forEach(tehai136, pai136 => {
        const pai34 = Math.floor(pai136/4);
        if(++tehai34[pai34] === 2) {
            head_candidate.push(pai34);
        }
    });


    return fuuro > 0 ? shantenNormal(tehai34, head_candidate, fuuro) : _.min([
        shantenNormal(tehai34, head_candidate, 0),
        shantenChitoi(tehai34, head_candidate),
        shantenKokushi(tehai34)
    ]);
};

module.exports = {
    getShanten,
    shantenNormal,
    shantenChitoi,
    shantenKokushi,
};