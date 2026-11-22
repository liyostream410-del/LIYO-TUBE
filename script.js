// 0. PIN එක (කැමති එකකට මාරු කරන්න)
const APP_PIN = "2026";

// 1. Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCplBR37Ql6uqqsT6gwzUAg2-BTHGNZh5Q",
  authDomain: "liyotube.firebaseapp.com",
  projectId: "liyotube",
  storageBucket: "liyotube.firebasestorage.app",
  messagingSenderId: "543021533103",
  appId: "1:543021533103:web:89ce4560c1614fe664515a",
  measurementId: "G-Q1Z31GFC2P"
};

// 2. Default Cloudinary විස්තර
const CLOUD_NAME = "uqgqeszi";
const DEFAULT_UPLOAD_PRESET = "YOUR_UPLOAD_PRESET"; // Cloudinary Unsigned preset නම

const DEFAULT_SETTINGS = {
    siteName: "LiyoTube",
    tagline: "Private Vault",
    accentColor: "#ff0000",
    uploadPreset: DEFAULT_UPLOAD_PRESET
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let allVideos = [];
let videosLoaded = false;

// Load & Apply Custom Settings
function getSiteSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem("liyoTubeCustomSettings") || "{}");
        return { ...DEFAULT_SETTINGS, ...saved };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

function applySiteSettings() {
    const settings = getSiteSettings();
    document.getElementById("pageTitle").innerText = `${settings.siteName} - ${settings.tagline}`;
    document.getElementById("lockSiteName").innerText = settings.siteName;
    document.getElementById("lockSubtext").innerText = `Enter your PIN to unlock ${settings.siteName}`;
    document.getElementById("navSiteName").innerText = settings.siteName;
    document.getElementById("navTagline").innerText = settings.tagline;
    document.documentElement.style.setProperty("--accent", settings.accentColor);
}

applySiteSettings();

// PIN Lock Controls
function unlockApp() {
    const input = document.getElementById("pinInput");
    const error = document.getElementById("pinError");

    if (input.value.trim() === APP_PIN) {
        sessionStorage.setItem("liyoTubeUnlocked", "true");
        document.getElementById("lockScreen").classList.add("hidden");
        document.getElementById("appContainer").classList.remove("hidden");
        error.innerText = "";
        input.value = "";
        if (!videosLoaded) {
            loadVideos();
            videosLoaded = true;
        }
    } else {
        error.innerText = "Wrong PIN! Try again.";
    }
}

function lockApp() {
    sessionStorage.removeItem("liyoTubeUnlocked");
    closePlayer();
    closeUploadModal();
    closeCustomPanel();
    document.getElementById("appContainer").classList.add("hidden");
    document.getElementById("lockScreen").classList.remove("hidden");
}

if (sessionStorage.getItem("liyoTubeUnlocked") === "true") {
    document.getElementById("lockScreen").classList.add("hidden");
    document.getElementById("appContainer").classList.remove("hidden");
    loadVideos();
    videosLoaded = true;
}

// Custom Panel Controls (Protected by PIN session)
function openCustomPanel() {
    if (sessionStorage.getItem("liyoTubeUnlocked") !== "true") {
        alert("Please unlock with your PIN first!");
        return;
    }
    const settings = getSiteSettings();
    document.getElementById("customSiteName").value = settings.siteName;
    document.getElementById("customTagline").value = settings.tagline;
    document.getElementById("customAccentColor").value = settings.accentColor;
    document.getElementById("customUploadPreset").value = settings.uploadPreset;
    document.getElementById("customPanelStatus").innerText = "";
    document.getElementById("customPanelModal").classList.remove("hidden");
}

function closeCustomPanel() {
    document.getElementById("customPanelModal").classList.add("hidden");
}

function saveCustomSettings() {
    const siteName = document.getElementById("customSiteName").value.trim() || DEFAULT_SETTINGS.siteName;
    const tagline = document.getElementById("customTagline").value.trim() || DEFAULT_SETTINGS.tagline;
    const accentColor = document.getElementById("customAccentColor").value || DEFAULT_SETTINGS.accentColor;
    const uploadPreset = document.getElementById("customUploadPreset").value.trim() || DEFAULT_UPLOAD_PRESET;

    const newSettings = { siteName, tagline, accentColor, uploadPreset };
    localStorage.setItem("liyoTubeCustomSettings", JSON.stringify(newSettings));
    applySiteSettings();
    document.getElementById("customPanelStatus").innerText = "Saved! ✅";
}

function resetCustomSettings() {
    localStorage.removeItem("liyoTubeCustomSettings");
    applySiteSettings();
    openCustomPanel();
    document.getElementById("customPanelStatus").innerText = "Reset to default! 🔄";
}

function updateFileName() {
    const fileInput = document.getElementById("videoFile");
    const label = document.getElementById("fileLabelText");
    if (fileInput.files.length > 0) {
        label.innerHTML = `✅ ${fileInput.files[0].name}<input type="file" id="videoFile" accept="video/*" onchange="updateFileName()">`;
    }
}

// Load videos from Firestore
function loadVideos() {
    db.collection("videos").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
        allVideos = [];
        snapshot.forEach((doc) => {
            allVideos.push({ id: doc.id, ...doc.data() });
        });
        displayVideos(allVideos);
    });
}

// Render Video Cards
function displayVideos(videos) {
    const grid = document.getElementById("videoGrid");
    grid.innerHTML = "";

    if (videos.length === 0) {
        grid.innerHTML = "<p style='color:#aaa;'>No videos uploaded yet. Click Upload to add one!</p>";
        return;
    }

    videos.forEach((video) => {
        const thumbnailUrl = video.url.replace(/\.[^/.]+$/, ".jpg");

        const card = document.createElement("div");
        card.className = "video-card";
        card.onclick = () => playVideo(video);

        card.innerHTML = `
            <div class="thumb-box-img">
                <img src="${thumbnailUrl}" class="thumbnail" alt="Thumbnail" onerror="this.src='https://via.placeholder.com/300x170/000000/FFFFFF?text=Video'">
            </div>
            <div class="video-info">
                <h3>${video.title}</h3>
                <p>${video.description || "No description"}</p>
            </div>
        `;
        grid.appendChild(card);
    });
}

function playVideo(video) {
    const playerSection = document.getElementById("playerSection");
    const player = document.getElementById("mainVideoPlayer");

    player.src = video.url;
    document.getElementById("playingTitle").innerText = video.title;
    document.getElementById("playingDesc").innerText = video.description || "No description provided.";

    playerSection.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function closePlayer() {
    const player = document.getElementById("mainVideoPlayer");
    player.pause();
    player.src = "";
    document.getElementById("playerSection").classList.add("hidden");
}

function searchVideos() {
    const query = document.getElementById("searchInput").value.toLowerCase();
    const filtered = allVideos.filter(v =>
        v.title.toLowerCase().includes(query) ||
        (v.description && v.description.toLowerCase().includes(query))
    );
    displayVideos(filtered);
}

function openUploadModal() {
    document.getElementById("uploadModal").classList.remove("hidden");
}

function closeUploadModal() {
    document.getElementById("uploadModal").classList.add("hidden");
    document.getElementById("uploadStatus").innerText = "";
}

async function uploadVideo() {
    const title = document.getElementById("videoTitle").value.trim();
    const desc = document.getElementById("videoDesc").value.trim();
    const fileInput = document.getElementById("videoFile");
    const statusDiv = document.getElementById("uploadStatus");
    const btn = document.getElementById("submitUpload");
    const activePreset = getSiteSettings().uploadPreset;

    if (!title || fileInput.files.length === 0) {
        alert("Please enter a title and select a video file!");
        return;
    }

    if (!activePreset || activePreset === "YOUR_UPLOAD_PRESET") {
        alert("Please set your Cloudinary Unsigned Upload Preset in the Custom Panel (⚙️) first!");
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", activePreset);

    btn.disabled = true;
    statusDiv.innerText = "Uploading video... Please wait";

    try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, {
            method: "POST",
            body: formData
        });
        const data = await res.json();

        if (data.secure_url) {
            await db.collection("videos").add({
                title: title,
                description: desc,
                url: data.secure_url,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            statusDiv.innerText = "Upload Complete!";
            document.getElementById("videoTitle").value = "";
            document.getElementById("videoDesc").value = "";
            fileInput.value = "";
            setTimeout(closeUploadModal, 1200);
        } else {
            throw new Error("Upload failed");
        }
    } catch (error) {
        console.error(error);
        statusDiv.innerText = "Error uploading video. Check your Cloudinary settings.";
    } finally {
        btn.disabled = false;
    }
}
