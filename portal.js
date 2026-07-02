
// ===============================
// LIVE CLOCK
// ===============================

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


// ===============================
// FACE MATCH PERCENTAGE
// ===============================

const matchData = [

    "72%",
    "84%",
    "91%",
    "98%",
    "MATCH FOUND"

];

let index = 0;

setInterval(()=>{

    const match =
    document.getElementById(
    "matchPercent"
    );

    if(match){

        match.innerHTML =
        matchData[index];

        index++;

        if(index >=
        matchData.length){

            index = 0;
        }
    }

},2000);


// ===============================
// STATUS CARD GLOW
// ===============================

const cards =
document.querySelectorAll(
".status-card"
);

setInterval(()=>{

    const randomCard =
    cards[Math.floor(
    Math.random()*cards.length
    )];

    if(randomCard){

        randomCard.style.boxShadow =
        "0 0 25px #00ff66";

        setTimeout(()=>{

            randomCard.style.boxShadow =
            "none";

        },700);
    }

},2000);


// ===============================
// SEARCH BUTTON
// ===============================

const searchBtn =
document.querySelector(
".search-btn"
);

if(searchBtn){

    searchBtn.addEventListener(
    "click",

    ()=>{

        alert(
        "Searching Database...\n\n" +
        "AWS CLOUD ACTIVE\n" +
        "DATABASE ONLINE\n" +
        "AI MATCHING STARTED"
        );

        // Later:
        // window.location.href =
        // "results.html";

    }

    );
}


// ===============================
// MINI CARD GLOW
// ===============================

const miniCards =
document.querySelectorAll(
".mini-card"
);

setInterval(()=>{

    miniCards.forEach(card=>{

        card.style.opacity =
        Math.random() > 0.5
        ? "1"
        : "0.85";

    });

},1000);


// ===============================
// SYSTEM START
// ===============================

console.log(
"PROJECT REUNITE PORTAL LOADED"
);
// ===============================
// SAVE RECORD BUTTON
// ===============================

const saveBtn =
document.getElementById("saveBtn");

if(saveBtn){

    saveBtn.addEventListener("click",()=>{

        const photoFile =
        document.getElementById("photo").files[0];

        const caseData = {

            caseId:
            document.getElementById("caseId").value,

            personName:
            document.getElementById("personName").value,

            age:
            document.getElementById("age").value,

            gender:
            document.getElementById("gender").value,

            contact:
            document.getElementById("contact").value,

            location:
            document.getElementById("location").value,

            missingDate:
            document.getElementById("missingDate").value,

            info:
            document.getElementById("info").value,

            photo: ""
        };

        if(photoFile){

            const reader =
            new FileReader();

            reader.onload =
            function(e){

                caseData.photo =
                e.target.result;

                let cases =
                JSON.parse(
                localStorage.getItem(
                "savedCases"
                )) || [];

                cases.push(caseData);

                localStorage.setItem(
                    "savedCases",
                    JSON.stringify(cases)
                );

                window.location.href =
                "records.html";
            };

            reader.readAsDataURL(
            photoFile
            );

        }else{

            let cases =
            JSON.parse(
            localStorage.getItem(
            "savedCases"
            )) || [];

            cases.push(caseData);

            localStorage.setItem(
                "savedCases",
                JSON.stringify(cases)
            );

            window.location.href =
            "records.html";
        }

    });

}

// ===============================
// SAVED CASES BUTTON
// ===============================

const recordsBtn =
document.getElementById("recordsBtn");

if(recordsBtn){

    recordsBtn.addEventListener(
    "click",()=>{

        window.location.href =
        "records.html";

    });

}