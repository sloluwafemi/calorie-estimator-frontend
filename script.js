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
            // Set calories in displayResults
        } else {
            // Set calories in displayResults
            console.error("Unexpected calorie API response:", data);
        }

    } catch (error) {
        console.error("Error fetching calorie data:", error);
        // Set calories in displayResults
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
        // ... (Your existing camera access check code)

        const response = await fetch("https://calorie-estimator-backend.onrender.com/identify-food", {
            // ... (Your existing fetch request code)
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
            fetchCalorieData(foodName); // Call fetchCalorieData

            // ... (Your existing code to populate resultsList)

        } else {
            console.error("No concepts found in response:", data);
        }

    } catch (error) {
        console.error("Error identifying food:", error);
        // ... (Your existing error handling code)
    }
}


document.addEventListener('DOMContentLoaded', () => {
    // ... (Your existing DOMContentLoaded event listener code)
});


function displayResults(data) {
    const resultsDiv = document.getElementById('results');

    if (!resultsDiv) {
        console.error("resultsDiv element not found!");
        return;
    }

    const foodName = data.foodName || "N/A";
    const calories = data.calories || "N/A";

    resultsDiv.innerHTML = `
        <p id="foodName"><strong>Identified Food:</strong> ${foodName}</p>
        <p id="calories"><strong>Calories:</strong> ${calories}</p>
        <ul id="resultsList"></ul>
    `;

    const resultsList = document.getElementById('resultsList');

    if (data.alternatives && data.alternatives.length > 0) {
        // ... (Your existing code to populate resultsList)
    }

    resultsDiv.style.display = 'block';

    // Now set the calories here, after the element is created:
    const caloriesElement = document.getElementById('calories');
    if (caloriesElement) {
      caloriesElement.innerText = `Calories: ${calories}`;
    } else {
      console.error("Calories element not found!");
    }
}
