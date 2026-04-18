class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    add(other) {
        return new Point(this.x + other.x, this.y + other.y);
    }

    sub(other) {
        return new Point(this.x - other.x, this.y - other.y);
    }

    static polar(r, theta) {
        return new Point(r * Math.cos(theta), r * Math.sin(theta));
    }

    angleTo(other) {
        return Math.atan2((other.y - this.y), (other.x - this.x));
    }

    distanceTo(other) {
        return Math.hypot((this.x - other.x), (this.y - other.y));
    }

    lerp(other, mix) {
        return new Point(lerp(this.x, other.x, mix), lerp(this.y, other.y, mix));
    }

    static randomOnEdge() {           
        let a = Math.random();
        let b = Math.random();       
        if (a > 0.5) {
            if (b > 0.5) {
                return new Point(0, Math.random() * canvas.height);
            } else {
                return new Point(canvas.width, Math.random() * canvas.height);
            }
        } else {
            if (b > 0.5) {
                return new Point(Math.random() * canvas.width, 0);
            } else {
                return new Point(Math.random() * canvas.width, canvas.height);
            }
        }       
    }
}

class Waveform {
    constructor() {       
        this.totalSamples = 10 * 44100
        this.samplesPerUnit = 1
        this.sampleScale = 120
        this.sampleRate = 44100
        this.startTime = 0        
        this.active = false,
        this.activeScale = 0,
        this.nextActiveScale = 0,
        this.step = 0
        this.buffer = []
        this.segmentCount = 15;
        this.playheadOffset = 50;
        this.path = []      
        this.nextPath = []  
        this.minPathDistance = 300;
        this.distances = []
        this.angles = []
        this.width = 150
        this.dashSpacing = 10
        this.dashWidth = 3        
        this.audioSource = audioContext.createBufferSource();      
    }

    recalculate() {
        this.distances = this.path.map((point, index) => point.distanceTo(this.path[(index + 1) % this.path.length]));
        this.angles  =   this.path.map((point, index) => point.angleTo(this.path[(index + 1) % this.path.length]));
    }

    pathDistance(start, end) {        
        return this.distances.slice(start, end).reduce((a, b) => a + b, 0);
    }

    pathInverseLerp(i) {        
        return this.pathDistance(0, i) / this.pathDistance(0, -1);
    }

    loadTrack(name) {
        this.stop();
        this.audioSource = audioContext.createBufferSource();  
        this.buffer = [] 
        this.buffer = audioData[name].getChannelData(0);
        this.audioSource.buffer = audioData[name]
        this.audioSource.connect(audioContext.destination)    
        this.startTime = audioContext.currentTime;    
        this.step = Math.floor(this.buffer.length / this.totalSamples);         
        this.active = true;      
        this.nextActiveScale = 1;  
        this.audioSource.loop = true;
        this.audioSource.start();
    }            

    stop() {       
        
        this.active = false;    
        this.nextActiveScale = 0;
        try {
            this.audioSource.stop();
        } catch {} 
    }

    randomizePath() {        
        this.nextPath[0] = new Point(0, canvas.height / 2);
        this.nextPath[1] = new Point(canvas.width / 3, canvas.height / 2);
        for (let i = 2; i < this.segmentCount; i++) {
            
            let longEnough = false;
            let p;
            let count = 0;
            while (longEnough == false && (count < 100)) {
                p = new Point(Math.random() * (canvas.width - (canvas.width / 3)) + (canvas.width / 3), Math.random() * canvas.height);                
                if (p.distanceTo(this.nextPath[i - 1]) > this.minPathDistance) {
                    longEnough = true;
                } else {
                    count++
                }
            }
            this.nextPath[i] = p;
        }        
    }

    draw() {        
        for (let i = this.path.length - 2; i >= 0; i--) {
            let t = (i / (this.path.length - 1));
            let r = lerp(65, 255, t ** 0.5);
            let g = lerp(90, 255, t ** 0.5);
            let b = 255
            ctx.strokeStyle = "rgb(" + r + "," + g + "," + b +")"
            wave.drawBorder(i);
            wave.drawBackground(i);
            wave.drawWaveform(i);
        }
    }

    drawWaveform(i) {

        let color = ctx.strokeStyle;

        const timeElapsed = audioContext.currentTime - this.startTime;
        const audioBufferIndex = Math.floor(timeElapsed * audioContext.sampleRate);
       
        const distance = this.distances[i];    
        const angle = this.angles[i]
        const perp = angle + (Math.PI / 2);

        const pathSampleIndex = Math.floor(lerp(0, this.totalSamples, this.pathInverseLerp(i)));        
        const bufferSamplesPerSegment = Math.floor((distance / this.pathDistance()) * this.totalSamples);
        const pathSampleCount = Math.floor(distance * this.samplesPerUnit)    
        const playheadSampleOffset = Math.floor(this.playheadOffset * this.samplesPerUnit) 

        if (i == 0) {
            const dashCount = Math.floor(this.width / this.dashSpacing);
        
            ctx.lineWidth = 0.5; 
            ctx.strokeStyle = "rgb(86, 86, 194)"
            ctx.beginPath();
            for (let n = 0; n < dashCount; n++) {
                let t = (n / dashCount)
                ctx.moveTo(this.path[i].x + this.playheadOffset, this.path[i].y - this.width / 2 + t * this.width);
                ctx.lineTo(this.path[i].x + this.playheadOffset, this.path[i].y - this.width / 2 + t * this.width + this.dashWidth);
            }
            
            ctx.stroke();
            ctx.strokeStyle = color;
        }

        ctx.lineWidth = 1; 
        ctx.beginPath();   
        ctx.moveTo(this.path[i].x, this.path[i].y);             
        for (let n = 0; n < pathSampleCount; n++) {
            let t = n / pathSampleCount;
            const sampleIndex = (pathSampleIndex - playheadSampleOffset + audioBufferIndex + Math.floor(t * bufferSamplesPerSegment)) % this.buffer.length;            
            const sample = (this.buffer[sampleIndex]);    
            const x = lerp(this.path[i].x, this.path[i + 1].x, t);      
            const y = lerp(this.path[i].y, this.path[i + 1].y, t);              
            const offset = Point.polar(sample * this.sampleScale * this.activeScale, perp);
            ctx.lineTo(x + offset.x, y + offset.y);            
        }
        ctx.stroke();
        
    }

    drawBackground(i) {
                    
        const angle = this.angles[i]; 
        const perp = angle + (Math.PI / 2);            
        const widthOffset = Point.polar(this.width / 2, perp);

        let rectPath = new Path2D();
        let rect = [this.path[i].add(widthOffset), this.path[i + 1].add(widthOffset), this.path[i + 1].sub(widthOffset), this.path[i].sub(widthOffset)];
        rectPath.moveTo(rect[3].x, rect[3].y);
        for (const point of rect) {
            rectPath.lineTo(point.x, point.y);
        }  
        rectPath.closePath();
        
        ctx.fill(rectPath, "evenodd")  
        
    }

    drawBorder(i) {

        ctx.lineWidth = 2; 
   

        const distance = this.distances[i]  
        const angle = this.angles[i]
        const perp = angle + (Math.PI / 2);

        const horizontalDashCount = Math.floor(distance / this.dashSpacing);
        const horizontalDashOffset = Point.polar(this.dashWidth, angle);

        const verticalDashCount = Math.floor(this.width / this.dashSpacing);
        const verticalDashOffset =  Point.polar(-this.dashWidth, perp);
        
        const widthOffset = Point.polar(this.width / 2, perp);

        ctx.beginPath();            
        for (let n = 0; n < horizontalDashCount; n++) {
            let t = n / horizontalDashCount;
            const point = this.path[i].lerp(this.path[i + 1], t);                           
            ctx.moveTo(point.x + widthOffset.x, point.y + widthOffset.y);
            ctx.lineTo(point.x + widthOffset.x + horizontalDashOffset.x, point.y + widthOffset.y + horizontalDashOffset.y);  
            ctx.moveTo(point.x - widthOffset.x, point.y - widthOffset.y);
            ctx.lineTo(point.x - widthOffset.x + horizontalDashOffset.x, point.y - widthOffset.y + horizontalDashOffset.y);  
        }
        for (let n = 0; n < verticalDashCount; n++) {
            let t = n / verticalDashCount;
            const point0 = this.path[i].add(widthOffset).lerp(this.path[i].sub(widthOffset), t);   
            const point1 = point0.add(Point.polar(distance, angle));         
            ctx.moveTo(point0.x, point0.y);
            ctx.lineTo(point0.x + verticalDashOffset.x, point0.y + verticalDashOffset.y); 
            ctx.moveTo(point1.x, point1.y);
            ctx.lineTo(point1.x + verticalDashOffset.x, point1.y + verticalDashOffset.y);  
                
        }
        
        ctx.stroke();  
        

    }    
    
}

let loadedAudio = false;

const lerp = (a, b, mix) => a + (b - a) * mix;

const inverseLerp = (a, b, t) => (t - a) / (b - a);

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const audioContext = new AudioContext();
const updateDuration = 10;
const heightThreshold = 750;
let wave;
let sampleCountSlider = document.getElementById("sampleCountSlider");
let sampleResolutionSlider = document.getElementById("sampleResolutionSlider");
const audioFiles = ["book.wav", "skee.wav", "crop circles.wav", "matmo.wav", "op bloom.wav", "parallel.wav", "ircurs.wav", "synthesizedSea.wav"]
let gradient;
let audioData = {};
let mainColor = "rgb(65, 90, 255)";

function init() {
    wave = new Waveform();
   
    loadAudio();   
    waitForLoad();    
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    wave.randomizePath();
    if (canvas.height < heightThreshold) {
        let h = lerp(50, 100, inverseLerp(heightThreshold, 0, canvas.height)) + "%"       
        document.getElementById("top-container").style.width = h
    } else {
        document.getElementById("top-container").style.width = "50%"
        
    }
}

async function loadAudio() {
    for (const file of audioFiles) {
        const response = await fetch(file);
        const data =  await audioContext.decodeAudioData(await response.arrayBuffer()); 
        audioData[file] = data; 
    }     
    loadedAudio = true;  
}

function waitForLoad() {
    if (loadedAudio) { 
        onLoadedAudio();
    } else {
        setTimeout(waitForLoad, updateDuration);
    }   
}

function onLoadedAudio() {              
    
    wave.path.push(new Point(0, 200), new Point(500, 400))
    wave.nextPath.push(new Point(0, 400), new Point(500, 400))
    window.addEventListener('resize', resize);    
    resize(); 
    for (let i = 0; i < wave.segmentCount; i++) {
        wave.path.push(new Point((i / wave.segmentCount) * (canvas.width - 500) + 500, 400));
    }
    setInterval(wave.randomizePath.bind(wave), 5000)
   
    // wave.randomizePath();

    gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0.5, "white");
    gradient.addColorStop(1, "rgb(248, 248, 248)");

    //wave.path.push(new Point(0, 300), new Point(900, 300))

    wave.loadTrack("matmo.wav")
    
    update();
}

function update() {   

    let t = Date.now()
    ctx.reset();    
    
    for (let i = 0; i < wave.segmentCount; i++) {
        wave.path[i] = wave.path[i].lerp(wave.nextPath[i], 0.01);
    }
    wave.recalculate();
    wave.activeScale = lerp(wave.activeScale, wave.nextActiveScale, 0.1)

    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = gradient
    ctx.fill()

    wave.draw();
    setTimeout(update, updateDuration);

}

sampleCountSlider.oninput = function() {
    wave.totalSamples = Math.floor(this.value * 44100);   
}


sampleResolutionSlider.oninput = function() {
    wave.samplesPerUnit = 1 / this.value;
}

function test() {

}