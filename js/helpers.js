function getMapSector(x, z) {
    var x = Math.floor((900 - x) / 100);
    var y = Math.floor((900 - z) / 100);
    return {x: x, y: y};
}

function randomIntFromInterval(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min);
}