// ***fetchCalorieData() MUST be at the top***
async function fetchCalorieData(foodName) {
    try {
        const apiKey = 'ZvHXktHZ/pdnpGCOp/H4Bw==Sfi4OMMAMdmPU0Gj'; // Your provided API key
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


document.getElementById('imageUpload').addEventListener('change', function(event) {
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

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            EXIF.getData(file, function() {  // Get EXIF data
                const orientation = EXIF.getTag(this, 'Orientation'); // Get orientation tag

                const img = document.createElement('img'); // Create a temporary image element
                img.src = event.target.result;

                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // Set canvas dimensions (adjust as needed)
                    canvas.width = img.width;
                    canvas.height = img.height;

                    // Apply rotation based on orientation
                    switch (orientation) {
                        case 3: // 180 degrees
                            ctx.rotate(Math.PI);
                            ctx.translate(-img.width, -img.height);
                            break;
                        case 6: // 90 degrees clockwise
                            ctx.rotate(Math.PI / 2);
                            ctx.translate(-img.height, 0);
                            break;
                        case 8: // 90 degrees counterclockwise
                            ctx.rotate(-Math.PI / 2);
                            ctx.translate(0, -img.width);
                            break;
                    }

                    ctx.drawImage(img, 0, 0);  // Draw the rotated image onto the canvas

                    const base64 = canvas.toDataURL('image/jpeg'); // Get base64 from the canvas

                    resolve(base64.split(',')[1]); // Resolve with base64 data
                };
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function identifyFood(file) {
    const base64Image = await toBase64(file);

    try {
        // Check if the file was accessed from the camera (mobile only)
        if (file.name === undefined) { // No file name means it came from camera
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true }); // Request camera access

                // If permission is granted, do nothing (continue with upload)
                // If permission is denied, throw an error that we'll catch
            } catch (err) {
                throw new Error("Camera access denied. Please allow camera permissions to use this feature."); // Error message
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
            document.getElementById('foodName').innerText = `Identified Food: ${foodName}`;
            fetchCalorieData(foodName); // Call the function

            const resultsList = document.getElementById('resultsList');
            resultsList.innerHTML = ''; // Clear previous results

            concepts.forEach(concept => {
                const listItem = document.createElement('li');
                listItem.textContent = `${concept.name}: ${(concept.value * 100).toFixed(2)}%`;
                resultsList.appendChild(listItem);
            });

        } else {
            document.getElementById('foodName').innerText = "Could not identify food.";
            console.error("No concepts found in response:", data);
        }

    } catch (error) {
        console.error("Error identifying food:", error);
        document.getElementById('foodName').innerText = error.message || "Error identifying food."; // Show error message
        const resultsList = document.getElementById('resultsList');
        resultsList.innerHTML = '';
    }
}
