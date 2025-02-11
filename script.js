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


document.addEventListener('DOMContentLoaded', () => {
    const imageUpload = document.getElementById('imageUpload');
    const preview = document.getElementById('preview');
    const analyzeButton = document.getElementById('analyzeButton');
    const resultsDiv = document.getElementById('results'); // Get the results div

    imageUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.src = e.target.result;
                preview.style.display = 'block';
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
                fetch('https://your-backend-name.onrender.com/identify-food', { // Replace with your backend URL
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
                    displayResults(data); // Call displayResults
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

    function displayResults(data) {
        // Assuming your backend returns data in a similar format as before
        const foodName = data.foodName; // Adjust if your data structure is different
        const calories = data.calories; // Adjust if your data structure is different

        resultsDiv.innerHTML = `
            <p><strong>Identified Food:</strong> ${foodName}</p>
            <p><strong>Calories:</strong> ${calories}</p>
            <ul></ul>
        `;

        const resultsList = resultsDiv.querySelector('ul');
        if (data.alternatives && data.alternatives.length > 0) {
            data.alternatives.forEach(alt => {
                const li = document.createElement('li');
                li.textContent = `${alt.name} (${Math.round(alt.confidence * 100)}% confident)`;
                resultsList.appendChild(li);
            });
        }

        resultsDiv.style.display = 'block'; // Show the results
    }
});
