// Configure backend URL dynamically (if running on localhost, use local port 8000, otherwise use your deployed backend)
const BACKEND_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:8000"
    : "https://downloadall-thatyouwant.onrender.com"; // REPLACE with your actual deployed Render backend URL if changed

// This function handles the form submission when a user tries to download a video
async function handleFormSubmit(event) {
    // Prevent the default form submission behavior (which reloads the page)
    event.preventDefault();

    // Get the HTML elements we need to interact with
    const urlInput = document.getElementById("youtubeUrl");
    const formatSelect = document.getElementById("formatSelect");
    const downloadButton = document.getElementById("downloadBtn");
    const loadingState = document.getElementById("loadingState");
    const successState = document.getElementById("successState");
    const errorState = document.getElementById("errorState");
    const successMessage = document.getElementById("successMessage");
    const errorMessage = document.getElementById("errorMessage");

    // Hide any previous success or error messages
    successState.classList.add("hidden");
    errorState.classList.add("hidden");

    // Get and trim the YouTube URL entered by the user
    const youtubeUrl = urlInput.value.trim();
    // Get the selected format
    const downloadFormat = formatSelect.value;

    // Double check that the input is not empty
    if (youtubeUrl === "") {
        errorMessage.innerText = "Please enter a valid YouTube URL.";
        errorState.classList.remove("hidden");
        return;
    }

    // Disable the inputs and download button to prevent multiple submissions
    urlInput.disabled = true;
    formatSelect.disabled = true;
    downloadButton.disabled = true;

    // Show the loading text/spinner
    loadingState.classList.remove("hidden");

    try {
        // Send a POST request to the backend API
        const response = await fetch(BACKEND_BASE_URL + "/download", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                url: youtubeUrl,
                format: downloadFormat
            })
        });

        // Check if the response status is OK (status code 200-299)
        if (response.ok) {
            // Get filename from Content-Disposition header
            const contentDisposition = response.headers.get("Content-Disposition");
            let filename = "video.mp4";
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = decodeURIComponent(filenameMatch[1]);
                }
            }

            // Convert response stream to blob
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            
            // Create a temporary link and trigger download
            const tempLink = document.createElement("a");
            tempLink.href = downloadUrl;
            tempLink.download = filename;
            document.body.appendChild(tempLink);
            tempLink.click();
            
            // Clean up temporary elements and URL
            document.body.removeChild(tempLink);
            window.URL.revokeObjectURL(downloadUrl);

            // Display success message
            successMessage.innerText = `"${filename}" has been successfully downloaded!`;
            successState.classList.remove("hidden");
            
            // Clear the input field and reset dropdown
            urlInput.value = "";
            resetDropdownOptions();
        } else {
            // Parse error JSON from response
            const data = await response.json();
            errorMessage.innerText = data.message || "Failed to download video. Please try again.";
            errorState.classList.remove("hidden");
        }
    } catch (error) {
        console.error(error);
        errorMessage.innerText = "Unable to connect to the downloader service. Make sure the backend server is running.";
        errorState.classList.remove("hidden");
    } finally {
        // Hide the loading state once the request is complete (whether it succeeded or failed)
        loadingState.classList.add("hidden");

        // Re-enable the input fields and download button
        urlInput.disabled = false;
        formatSelect.disabled = false;
        downloadButton.disabled = false;
    }
}

// Function to fetch video format sizes dynamically
async function fetchVideoSizes() {
    const urlInput = document.getElementById("youtubeUrl");
    const formatSelect = document.getElementById("formatSelect");
    const youtubeUrl = urlInput.value.trim();

    // If the input is empty, reset select options back to default and stop
    if (youtubeUrl === "") {
        resetDropdownOptions();
        return;
    }

    // Set temporary state inside dropdown
    formatSelect.innerHTML = "<option value='best'>Fetching sizes... Please wait</option>";

    try {
        // Fetch format details from backend "/info" endpoint
        const response = await fetch(BACKEND_BASE_URL + "/info", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                url: youtubeUrl,
                format: "best" // format is required by model, passing "best" as dummy value
            })
        });

        if (response.ok) {
            const sizes = await response.json();

            // Clear the select box
            formatSelect.innerHTML = "";

            // Add dynamic options with sizes
            addDropdownOption(formatSelect, "best", "MP4 - Best Quality");
            addDropdownOption(formatSelect, "1080", "MP4 - 1080p (" + (sizes["1080"] || "Unknown") + ")");
            addDropdownOption(formatSelect, "720", "MP4 - 720p (" + (sizes["720"] || "Unknown") + ")");
            addDropdownOption(formatSelect, "480", "MP4 - 480p (" + (sizes["480"] || "Unknown") + ")");
            addDropdownOption(formatSelect, "360", "MP4 - 360p (" + (sizes["360"] || "Unknown") + ")");
            addDropdownOption(formatSelect, "144", "MP4 - 144p (" + (sizes["144"] || "Unknown") + ")");
            addDropdownOption(formatSelect, "mp3", "MP3 - Audio Only (" + (sizes["mp3"] || "Unknown") + ")");
        } else {
            resetDropdownOptionsWithLabel("Sizes Unavailable");
        }
    } catch (e) {
        resetDropdownOptionsWithLabel("Offline (Failed to fetch sizes)");
    }
}

// Helper function to append a new option to a select element
function addDropdownOption(selectElement, value, text) {
    const option = document.createElement("option");
    option.value = value;
    option.innerText = text;
    selectElement.appendChild(option);
}

// Reset select options back to default values
function resetDropdownOptions() {
    const formatSelect = document.getElementById("formatSelect");
    formatSelect.innerHTML = "";
    addDropdownOption(formatSelect, "best", "MP4 - Best Quality");
    addDropdownOption(formatSelect, "1080", "MP4 - 1080p");
    addDropdownOption(formatSelect, "720", "MP4 - 720p");
    addDropdownOption(formatSelect, "480", "MP4 - 480p");
    addDropdownOption(formatSelect, "360", "MP4 - 360p");
    addDropdownOption(formatSelect, "144", "MP4 - 144p");
    addDropdownOption(formatSelect, "mp3", "MP3 - Audio Only");
}

// Reset select options and append a custom label/error message
function resetDropdownOptionsWithLabel(label) {
    const formatSelect = document.getElementById("formatSelect");
    formatSelect.innerHTML = "";
    addDropdownOption(formatSelect, "best", "MP4 - Best Quality (" + label + ")");
    addDropdownOption(formatSelect, "1080", "MP4 - 1080p");
    addDropdownOption(formatSelect, "720", "MP4 - 720p");
    addDropdownOption(formatSelect, "480", "MP4 - 480p");
    addDropdownOption(formatSelect, "360", "MP4 - 360p");
    addDropdownOption(formatSelect, "144", "MP4 - 144p");
    addDropdownOption(formatSelect, "mp3", "MP3 - Audio Only");
}

// Bind "change" event listener to the URL input field
// This triggers as soon as the user pastes/types a URL and clicks out/focuses away
document.getElementById("youtubeUrl").addEventListener("change", fetchVideoSizes);

// ==========================================
// PWA Installation & Service Worker Setup
// ==========================================

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('PWA Service Worker Registered successfully!', reg.scope))
            .catch(err => console.error('PWA Service Worker registration failed:', err));
    });
}

let deferredPrompt;
const installBanner = document.getElementById('installBanner');
const installBtn = document.getElementById('installBtn');

// Capture the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default browser mini-infobar
    e.preventDefault();
    // Save the event to trigger later
    deferredPrompt = e;
    // Show the custom installation banner
    if (installBanner) {
        installBanner.classList.remove('hidden');
    }
});

// Trigger installation on button click
if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        
        // Show the native browser install dialog
        deferredPrompt.prompt();
        
        // Check the user response
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to PWA prompt: ${outcome}`);
        
        // Reset the prompt variable (it can only be used once)
        deferredPrompt = null;
        
        // Hide the install banner
        if (installBanner) {
            installBanner.classList.add('hidden');
        }
    });
}

// Log success when installed
window.addEventListener('appinstalled', (evt) => {
    console.log('StreamGlide has been successfully installed as a PWA!');
});

