// =================================
// LIVE CLOCK
// =================================

function updateClock(){

    const clock =
    document.getElementById("clock");

    if(clock){

        const now =
        new Date();

        clock.innerHTML =
        now.toLocaleTimeString();
    }
}

setInterval(updateClock,1000);

updateClock();


// =================================
// FACE MATCH PERCENTAGE
// =================================

const matchValues = [

    "72%",
    "84%",
    "91%",
    "98%",
    "MATCH FOUND"

];

let matchIndex = 0;

setInterval(()=>{

    const match =
    document.getElementById("matchPercent");

    if(match){

        match.innerHTML =
        matchValues[matchIndex];

        matchIndex++;

        if(matchIndex >= matchValues.length){

            matchIndex = 0;
        }
    }

},2000);


// =================================
// RANDOM CARD GLOW
// =================================

const cards =
document.querySelectorAll(".card");

setInterval(()=>{

    const card =
    cards[Math.floor(
        Math.random()*cards.length
    )];

    if(card){

        card.style.boxShadow =
        "0 0 35px #00ff66";

        setTimeout(()=>{

            card.style.boxShadow =
            "0 0 15px red";

        },700);
    }

},2000);


// =================================
// STATUS DOT BLINK
// =================================

const dots =
document.querySelectorAll(".status-dot");

setInterval(()=>{

    dots.forEach(dot=>{

        dot.style.opacity =
        Math.random() > 0.5
        ? "1"
        : "0.3";

    });

},1000);


// =================================
// PORTAL BUTTON
// =================================

const portalBtn =
document.querySelector(".portal-btn");

if(portalBtn){

    portalBtn.addEventListener("click",()=>{

       window.location.href = "portal.html";

    });

}


// =================================
// AI GRAPH RANDOM HEIGHTS
// =================================

const bars =
document.querySelectorAll(
".activity-bars span"
);

setInterval(()=>{

    bars.forEach(bar=>{

        const randomHeight =
        Math.floor(
            Math.random()*100
        ) + 20;

        bar.style.height =
        randomHeight + "px";

    });

},800);


// =================================
// LIVE FEED TICKER
// =================================

const ticker =
document.querySelector(
".ticker-text"
);

const messages = [

"AI ENGINE ACTIVE",
"DATABASE ONLINE",
"AWS CLOUD CONNECTED",
"FACE MATCHING RUNNING",
"SYSTEM SECURE",
"ENCRYPTION ENABLED",
"PROJECT REUNITE READY"

];

let tickerIndex = 0;

setInterval(()=>{

    if(ticker){

        ticker.innerHTML =
        messages[tickerIndex];

        tickerIndex++;

        if(
        tickerIndex >=
        messages.length
        ){

            tickerIndex = 0;
        }
    }

},2500);



// LIVE CLOCK

function updateClock() {

    const clock =
    document.getElementById("clock");

    if (clock) {

        const now = new Date();

        clock.innerHTML =
        now.toLocaleTimeString();

    }
}

updateClock();

setInterval(updateClock, 1000);
