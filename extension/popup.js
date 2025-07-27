// Discussions
const discussionsGroupEl = document.getElementById("discussions-group");
const startGetDiscussionsBtn = document.getElementById("start-get-discussions");
const stopGetDiscussionsBtn = document.getElementById("stop-get-discussions");
const statusEl = document.getElementById("status");

// Discussion Details
const discussionDetailsGroupEl = document.getElementById("discussion-details-group");
const startGetDiscussionDetailsBtn = document.getElementById("start-get-discussion-details");
const stopGetDiscussionDetailsBtn = document.getElementById("stop-get-discussion-details");
const statusDiscussionDetailsEl = document.getElementById("status-discussion-details");
const discussionDetailsSelectEl = document.getElementById("discussion-details-select");

// notfound
const notfoundGroupEl = document.querySelector(".notfound-group");

// Exams list
const EXAMS = [
    { name: 'AWS Certified Developer - Associate DVA-C02' },
    { name: 'AWS Certified Solutions Architect - Associate SAA-C03' },
    { name: 'AWS Certified Solutions Architect - Professional SAP-C02' },
    { name: 'AWS Certified SysOps Administrator - Associate' }, // SOA-C02
    { name: 'AWS Certified Database - Specialty' }, // DBS-C01
    { name: 'AWS Certified DevOps Engineer - Professional DOP-C02' },
    { name: 'AWS Certified Data Engineer - Associate DEA-C01' },
    { name: 'AWS Certified Security - Specialty SCS-C02' },
];
// ⏱ Khôi phục trạng thái khi mở lại popup
document.addEventListener("DOMContentLoaded", () => {
    getActiveTabUrl().then((currentUrl) => {
        let hasActivePage = false;
        if (checkDiscussionUrl(currentUrl)) {
            hasActivePage = true;
            discussionsGroupEl.style.display = "block";
        } else {
            discussionsGroupEl.style.display = "none";
        }

        if (checkDiscussionDetailsUrl(currentUrl)) {
            hasActivePage = true;
            discussionDetailsGroupEl.style.display = "block";
            EXAMS.forEach((exam) => {
                const option = document.createElement("option");
                option.value = exam.name;
                option.textContent = exam.name;
                discussionDetailsSelectEl.appendChild(option);
            });
        } else {
            discussionDetailsGroupEl.style.display = "none";
        }

        if (!hasActivePage) {
            notfoundGroupEl.style.display = "block";
        }
        else {
            notfoundGroupEl.style.display = "none";
        }
    });

    chrome.runtime.sendMessage({ action: "getStatus" }, (response) => {
        const status = response?.status || "idle";
        // if (status === "crawling") {
        //     startGetDiscussionsBtn.disabled = true;
        //     // startGetDiscussionsBtn.textContent = "Crawling...";
        //     stopGetDiscussionsBtn.disabled = false;
        //     statusEl.textContent = "Crawling in progress...";
        // } else if (status === "done") {
        //     startGetDiscussionsBtn.disabled = false;
        //     // startGetDiscussionsBtn.textContent = "Start Get Discussions";
        //     stopGetDiscussionsBtn.disabled = true;
        //     statusEl.textContent = "Done crawling.";
        // } else if (status === "stopped") {
        //     startGetDiscussionsBtn.disabled = false;
        //     // startGetDiscussionsBtn.textContent = "Start";
        //     stopGetDiscussionsBtn.disabled = true;
        //     statusEl.textContent = "Crawl stopped by user.";
        // } else {
        //     startGetDiscussionsBtn.disabled = false;
        //     stopGetDiscussionsBtn.disabled = true;
        //     // startGetDiscussionsBtn.textContent = "Start";
        //     statusEl.textContent = "Ready to start.";
        // }
    });
});


/* Start Get Discussions Process */
startGetDiscussionsBtn.addEventListener("click", () => {
    getActiveTabUrl().then((currentUrl) => {
        if (!checkDiscussionUrl(currentUrl)) {
            console.log("Current URL is not valid.");
            alert("This current Url cannot be crawled. Please navigate to a valid discussions page (e.g., discussions/amazon/12345/) before starting the crawl.");
            return;
        }

        chrome.runtime.sendMessage({ action: "startCrawlDiscussions" });
        startGetDiscussionsBtn.disabled = true;
        // startGetDiscussionsBtn.textContent = "Crawling...";
        stopGetDiscussionsBtn.disabled = false;
        statusEl.textContent = "Crawling in progress...";
    });
});

stopGetDiscussionsBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "stopCrawlDiscussions" });
    stopGetDiscussionsBtn.disabled = true;
    statusEl.textContent = "Stopping crawl...";
});
/* End Get Discussions Process */

/* Start Get Discussion Details Process */

startGetDiscussionDetailsBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            const currentUrl = tabs[0].url;

            if (!currentUrl.match(/discussions\/amazon\/view\/\d+?.*\//)) {
                console.log("Current URL is not valid.");
                alert("This current Url cannot be crawled. Please navigate to a valid discussions page (e.g., discussions/amazon/view/12345-aasdasd-asadasd/) before starting the crawl.");
                return;
            }

            const selectedExamName = discussionDetailsSelectEl.value;
            if (!selectedExamName) {
                alert("Please select an exam to crawl discussion details.");
                return;
            }

            chrome.runtime.sendMessage({ action: "startCrawlDiscussionDetails", examName: selectedExamName });
            startGetDiscussionDetailsBtn.disabled = true;
            // startGetDiscussionDetailsBtn.textContent = "Crawling...";
            stopGetDiscussionDetailsBtn.disabled = false;
            statusDiscussionDetailsEl.textContent = "Crawling in progress...";
        } else {
            console.log("No active tab found.");
        }
    });
});

stopGetDiscussionDetailsBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "stopCrawlDiscussionDetails" });
    stopGetDiscussionDetailsBtn.disabled = true;
    statusDiscussionDetailsEl.textContent = "Stopping crawl...";
});

/* End Get Discussion Details Process */

/* Utility Functions */
function checkDiscussionUrl(url) {
    return url.match(/discussions\/amazon\/\d+\//);
}

function checkDiscussionDetailsUrl(url) {
    return url.match(/discussions\/amazon\/view\/\d+?.*\//);
}

function getActiveTabUrl() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                resolve(tabs[0].url);
            } else {
                reject(new Error("No active tab found"));
            }
        });
    });
}
/* End Utility Functions */