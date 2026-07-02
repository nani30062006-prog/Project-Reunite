const recordsContainer =
document.getElementById("recordsContainer");

let cases =
JSON.parse(localStorage.getItem("savedCases"))
|| [];

if(cases.length === 0){

    recordsContainer.innerHTML = `
    <h2>NO RECORDS FOUND</h2>
    <p>Save a case from Investigation Portal.</p>
    `;

}
else{

    recordsContainer.innerHTML = "";

    cases.forEach((item,index)=>{

        recordsContainer.innerHTML += `
        <div class="record-card">

            <h3>${item.personName}</h3>

            <p><b>Case ID:</b> ${item.caseId}</p>

            <p><b>Age:</b> ${item.age}</p>

            <p><b>Gender:</b> ${item.gender}</p>

            <p><b>Contact:</b> ${item.contact}</p>

            <p><b>Location:</b> ${item.location}</p>

            <p><b>Date:</b> ${item.missingDate}</p>
            
<p><b>Photo:</b></p>
<img src="${item.photo}" width="150">
            <p><b>Info:</b> ${item.info}</p>


            <button onclick="deleteCase(${index})">
            DELETE
            </button>

        </div>
        `;
    });

}

function deleteCase(index){

    let cases =
    JSON.parse(localStorage.getItem("savedCases"))
    || [];

    cases.splice(index,1);

    localStorage.setItem(
        "savedCases",
        JSON.stringify(cases)
    );

    location.reload();
}