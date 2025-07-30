window.onload = init;

const sq = document.getElementById("sq");
const sqborder = document.getElementById("sqborder");
const screen = document.getElementById("screen");

sq.innerText = "";
const map = "·^*%&#▒";
// const map = "▒▒▒▒▒▒▒";
var w = 74;
var h = 37;
var t = 0;
var mx = 0;
var my = 0;

screen.addEventListener('mousemove', (event) => {mx = event.clientX; my = event.clientY})

function init() {   
    
   
    // sq.innerText = "++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++"   
    update()
}

function update() {
    t += 0.002;
    if (t >= 1) {
        t = 0;
    }

    var str = ""
    var borderStr = ""
    var value = 0
    for (i = 0; i < h; i++) {
        for (j = 0; j < w; j++) {
            var x = j / w 
            var y = i / h                         
            value = t + ((y * 4) - Math.sin(x * 4));
            value += Math.cos((y - 0.5) * my *0.05) * Math.tan((x - 0.5) * mx  * 0.005)
            value = value - Math.floor(value);
            var char = map[(Math.round(lerp(0, map.length - 1, value)))];                      
            if (i > 3 && i < 34 && j > 7 && j < 66) {
                char = "░"
            }
            str += char;
        }
        str += "\n"
    }

  
    
    sq.innerText = str    
    
    setTimeout(update, 5)
}


function lerp(a, b, mix) {
    return a * (1 - mix) + b * mix
}

function clamp(x, low, high) {
    return Math.min(Math.max(x, low), high)
}