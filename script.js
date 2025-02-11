// ***fetchCalorieData() MUST be at the top***
async function fetchCalorieData(foodName) {
    try {
        const apiKey = 'ZvHXktHZ/pdnpGCOp/H4Bw==Sfi4OMMAMdmPU0Gj';
        const apiEndpoint = `https://api.calorieninjas.com/v1/nutrition?query=${foodName}`;

        const response = await fetch(apiEndpoint, {
            headers: {
                'X-API-Key': apiKey
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Calorie API returned ${response.status}: ${errorData.message || response.statusText}`);
        }

        const data = await response.json();
        console.log("Calorie Data:", JSON.stringify(data, null, 2));

        if (data.items && data.items.length > 0) {
            const calories = data.items[0].calories;
            document.getElementById('calories').innerText = `Calories: ${calories}`;
        } else {
            document.getElementById('calories').innerText = "Calorie information not found.";
            console.error("Unexpected calorie API response:", data);
        }

    } catch (error) {
        console.error("Error fetching calorie data:", error);
        document.getElementById('calories').innerText = "Error fetching calorie information.";
    }
}

// ***toBase64 function moved OUTSIDE the DOMContentLoaded listener***
function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            EXIF.getData(file, function() {
                const orientation = EXIF.getTag(this, 'Orientation');

                const img = document.createElement('img');
                img.src = event.target.result;

                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    canvas.width = img.width;
                    canvas.height = img.height;

                    switch (orientation) {
                        case 3:
                            ctx.rotate(Math.PI);
                            ctx.translate(-img.width, -img.height);
                            break;
                        case 6:
                            ctx.rotate(Math.PI / 2);
                            ctx.translate(-img.height, 0);
                            break;
                        case 8:
                            ctx.rotate(-Math.PI / 2);
                            ctx.translate(0, -img.width);
                            break;
                    }

                    ctx.drawImage(img, 0, 0);

                    const base64 = canvas.toDataURL('image/jpeg');

                    resolve(base64.split(',')[1]);
                };
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ***identifyFood function moved ABOVE the event listener***
async function identifyFood(file) {
    const base64Image = await toBase64(file);

    try {
        // Check if the file was accessed from the camera (mobile only)
        if (file.name === undefined) { // No file name means it came from camera
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });

            } catch (err) {
                throw new Error("Camera access denied. Please allow camera permissions to use this feature.");
            }
        }

        const response = await fetch("https://calorie-estimator-backend.onrender.com/identify-food", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ image: base64Image })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Backend returned ${response.status}: ${errorData.error || response.statusText}`);
        }

        const data = await response.json();
        console.log("Full Response from Backend:", JSON.stringify(data, null, 2));

        const concepts = data?.outputs?.[0]?.data?.concepts;

        if (concepts && concepts.length > 0) {
            const foodName = concepts[0].name;
            // No need to set foodName here anymore, it's done in displayResults
            fetchCalorieData(foodName);

            const resultsList = document.getElementById('resultsList');
            resultsList.innerHTML = '';

            concepts.forEach(concept => {
                const listItem = document.createElement('li');
                listItem.textContent = `${concept.name}: ${(concept.value * 100).toFixed(2)}%`;
                resultsList.appendChild(listItem);
            });

        } else {
            // No need to set foodName here anymore, it's done in displayResults
            console.error("No concepts found in response:", data);
        }

    } catch (error) {
        console.error("Error identifying food:", error);
        // No need to set foodName here anymore, it's done in displayResults
        const resultsList = document.getElementById('resultsList');
        resultsList.innerHTML = '';
    }
}


document.addEventListener('DOMContentLoaded', () => {
    const imageUpload = document.getElementById('imageUpload');
    const preview = document.getElementById('preview');
    const analyzeButton = document.getElementById('analyzeButton');
    const resultsDiv = document.getElementById('results');

    imageUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('preview').src = e.target.result;
                document.getElementById('preview').style.display = 'block';
                identifyFood(file);
            };
            reader.readAsDataURL(file);
        }
    });

    analyzeButton.addEventListener('click', () => {
        const file = imageUpload.files[0];
        if (!file) {
            alert('Please select an image first.');
            return;
        }

        toBase64(file)
            .then(base64 => {
                fetch('https://calorie-estimator-backend.onrender.com/identify-food', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ image: base64 })
                })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(err => {throw new Error(err.message)});
                    }
                    return response.json();
                })
                .then(data => {
                    displayResults(data);
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred. Please try again later.');
                });
            })
            .catch(error => {
                console.error('Base64 conversion error:', error);
                alert('There was an error processing the image.');
            });
    });

    function displayResults(data) {
        const resultsDiv = document.getElementById('results');

        if (!resultsDiv) {
            console.error("resultsDiv element not found!");
            return;
        }

        const foodName = data.foodName;
        const calories = data.calories;

        resultsDiv.innerHTML = `
            <p id="foodName"><strong>Identified Food:</strong> ${foodName || "N/A"}</p>
            <p id="calories"><strong>Calories:</strong> ${calories || "N/A"}</p>
            <ul id="resultsList"></ul>  `; // Add id to the <ul>

        const resultsList = document.getElementById('resultsList'); // Get by ID now

        if (data.alternatives && data.alternatives.length > 0) {
            data.alternatives.forEach(alt => {
                const li = document.createElement('li');
                li.textContent = `${alt.name}: ${(alt.value * 100).toFixed(2)}%`;
                resultsList.appendChild(li);
            });
        }

        resultsDiv.style.display = 'block';
    }
});
