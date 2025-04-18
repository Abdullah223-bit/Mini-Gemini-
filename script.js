const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const chatsContainer = document.querySelector(".chats-container");
const container = document.querySelector(".container");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggle = document.querySelector("#theme-toggle-btn");
// use your api key from google ai
const API_KEY = "";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;


let typingInterval, controller;

const chatHistory = [];
const userData = { message: "", file: {} };

// function to create message element
function createMsgElement(content, ...classes)
{
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
}

const scrollToBottom = () => container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
{

}

const typingEffect = (text, textElement, botMsgDiv) =>
{
    textElement.textContent = "";
    const words = text.split(" ");

    let wordIndex = 0;
    
    typingInterval = setInterval(() => {
        if(wordIndex < words.length)
        {
            textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++]; 
        }
        else
        {
            clearInterval(typingInterval); 
            botMsgDiv.classList.remove("loading");
            document.body.classList.remove("bot-responding");
            scrollToBottom();
        }
    }, 40);
}

// generating gemini response using its free api
const generateResponse = async(botMsgDiv) =>
{
    //getting bots message element
    const textElement = botMsgDiv.querySelector(".message-text");
    controller = new AbortController();
    // add user message and file data to chat history
    chatHistory.push({
        role: "user",
        parts: [{ text: userData.message }, ...(userData.file.data ? [{ inline_data: (({ fileName, isImage, ...rest }) => rest)(userData.file) }] : [])]
    });

    try
    {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: chatHistory }),
            signal: controller.signal
        });

        const data = await response.json();
        if(!response.ok)
        {
            throw new Error(data.error.message);
        }
        //the response will contain mark down formatting so we can remove extra *s and process the response text and display it
        const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
        typingEffect(responseText, textElement, botMsgDiv);

        chatHistory.push({ role: "model", parts: [{ text: responseText }] });
    }
    catch(error)
    {
        textElement.style.color = "#d62939"
        textElement.textContent = error.name === "AbortError" ? "Response generation stopped." : error.message;
        botMsgDiv.classList.remove("loading");
        document.body.classList.remove("bot-responding");
        scrollToBottom();
    }
    finally
    {
        userData.file = {};
    }
}

// handle the form submission
const handleFormSubmit = (e) =>
{
    e.preventDefault();
    const userMessage = promptInput.value.trim();
    if(!userMessage || document.body.classList.contains("bot-responding")) return;

    promptInput.value = "";
    userData.message = userMessage;
    document.body.classList.add("bot-responding", "chats-active");
    fileUploadWrapper.classList.remove("active","img-attached", "file-attached");
    // generate user message and add it in chat
    const userMsgHTML = `<p class="message-text"></p>
    ${userData.file.data ? (userData.file.isImage ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" 
    class="img-attachment" />` : `<p class="file-attachement>"<span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`) : ""}`;
    const userMsgDiv = createMsgElement(userMsgHTML, "user-message");

    userMsgDiv.querySelector(".message-text").textContent = userMessage;
    chatsContainer.appendChild(userMsgDiv);
    scrollToBottom();

    setTimeout(() => {
        // generate bot message html and add it in chat container after 600ms
        const botMsgHTML = `<img src="gemini.svg" class="avatar"><p class="message-text">Just a sec..</p>`;
        const botMsgDiv = createMsgElement(botMsgHTML, "bot-message", "loading");
        chatsContainer.appendChild(botMsgDiv);
        scrollToBottom();
        generateResponse(botMsgDiv);
    }, 600);
}

// handle file input change
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if(!file) return;

    const isImage = file.type.startsWith("image/")
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (e) =>
    {
        fileInput.value = "";
        const base64String = e.target.result.split(",")[1];
        fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
        fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");

        // stores file data in userData obj
        userData.file = { fileName: file.name, data: base64String, mime_type: file.type, isImage };
    }
});

// cancel file upload
document.querySelector("#cancel-file-btn").addEventListener("click", () => {
    userData.file = {};
    fileUploadWrapper.classList.remove("active","img-attached", "file-attached");
});

// stop response 
document.querySelector("#stop-response-btn").addEventListener("click", () => {
    userData.file = {};
    controller?.abort();
    clearInterval(typingInterval);
    chatsContainer.querySelector(".bot-message.loading").classList.remove("loading");
    document.body.classList.remove("bot-responding");
});

// delete all chats
document.querySelector("#delete-chats-btn").addEventListener("click", () => {
    chatHistory.length = 0;
    chatsContainer.innerHTML = "";
    document.body.classList.remove("bot-responding", "chats-active");
});

// handle suggestions click
document.querySelectorAll(".suggestions-items").forEach(item => {
    item.addEventListener("click", () => {
        promptInput.value = item.querySelector(".text").textContent;
        promptForm.dispatchEvent(new Event("submit"));
    });
});

// 
document.addEventListener("click", ({ target }) => {
    const wrapper = document.querySelector(".prompt-wrapper");
    const shouldHide = target.classList.contains("prompt-input") || (wrapper.classList.contains("hide-controls") && 
    (target.id === "add-file-btn" || target.id === "stop-response-btn"));
    wrapper.classList.toggle("hide-controls", shouldHide);
});

// toggle dark/light theme
themeToggle.addEventListener("click", () => {
    const isLightThem = document.body.classList.toggle("light-theme");
    localStorage.setItem("themeColor", isLightThem ? "light_mode" : "dark_mode");
    themeToggle.textContent = isLightThem ? "dark_mode" : "light_mode";
});

// set initial theme from local storage 
const isLightThem = localStorage.getItem("themeColor") === "light_mode";
document.body.classList.toggle("light-theme", isLightThem);
// localStorage.setItem("themeColor", isLightThem ? "light_mode" : "dark_mode");
themeToggle.textContent = isLightThem ? "dark_mode" : "light_mode";

promptForm.addEventListener("submit", handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());

