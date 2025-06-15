let stopRequested = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "startCrawlDiscussions") {
        stopRequested = false;
        crawlDiscussions().then(() => {
            sendResponse({ status: "started" });
        }).catch(err => {
            sendResponse({ status: "error", message: err.message });
        });
        return true; // Giữ port mở chờ sendResponse
    }
    else if (message.action === "stopCrawlDiscussions") {
        stopRequested = true;
        sendResponse({ status: "stopped" });
        return true;
    }
    else if (message.action === "startCrawlDiscussionDetails") {
        stopRequested = false;
        const examName = message.examName || "";

        if (!examName) {
            sendResponse({ status: "error", message: "Exam name is required" });
            return false;
        }

        crawlDiscussionDetails(examName).then(() => {
            sendResponse({ status: "started" });
        }).catch(err => {
            sendResponse({ status: "error", message: err.message });
        });
        return true; // Giữ port mở chờ sendResponse
    }
    else if (message.action === "stopCrawlDiscussionDetails") {
        stopRequested = true;
        sendResponse({ status: "stopped" });
        return true;
    }
    else if (message.action === "getStatus") {
        sendResponse({ status: stopRequested ? "stopped" : "idle" });
        return true;
    }
    else {
        sendResponse({ status: "unknown_action" });
        return false;
    }
});

async function waitForListChange(tabId, oldCount, timeout = 30000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();

        async function checkList() {
            try {
                const [{ result: newCount }] = await chrome.scripting.executeScript({
                    target: { tabId },
                    func: () => document.querySelectorAll(".discussion-list .discussion-row").length,
                });

                if (newCount !== oldCount) {
                    resolve(newCount);
                } else if (Date.now() - start > timeout) {
                    reject(new Error("Timeout waiting for list change"));
                } else {
                    setTimeout(checkList, 1000);
                }
            } catch (err) {
                reject(err);
            }
        }

        checkList();
    });
}

async function waitForUrlChange(oldUrl, tabId, timeout = 30000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();

        async function checkUrl() {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const newUrl = tabs.find(t => t.id === tabId)?.url || "";

            if (newUrl !== oldUrl) {
                resolve(newUrl);
            } else if (Date.now() - start > timeout) {
                reject(new Error("Timeout waiting for URL change"));
            } else {
                setTimeout(checkUrl, 500);
            }
        }

        checkUrl();
    });
}

async function crawlDiscussions() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const MAX_PAGES = 100;

    for (let i = 0; i < MAX_PAGES; i++) {
        if (stopRequested) {
            chrome.runtime.sendMessage({ status: "stopped" }).catch(() => { });
            return;
        }

        // Lấy dữ liệu trang hiện tại
        const [{ result: pageData }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const items = [...document.querySelectorAll(".discussion-list .discussion-row")];
                return items.map(el => ({
                    title: el.querySelector(".discussion-title")?.innerText || "",
                    link: el.querySelector(".discussion-title a")?.href || ""
                }));
            }
        });

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

        const [updatedTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const urlObj = new URL(updatedTab.url);
        let path = urlObj.pathname.replace(/\//g, "-") || "root";
        if (path === "-") path = "root";
        const filename = `ExamTopic/discussions/crawled${path}_${timestamp}.json`;

        const dataWithMeta = {
            crawledAt: timestamp,
            url: updatedTab.url,
            items: pageData
        };

        const jsonStr = JSON.stringify(dataWithMeta, null, 2);
        const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
        const dataUrl = `data:application/json;base64,${base64}`;

        await chrome.downloads.download({
            url: dataUrl,
            filename: filename,
            saveAs: false
        });

        // Lấy số lượng item hiện tại trước khi bấm next
        const [{ result: oldCount }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => document.querySelectorAll(".discussion-list .discussion-row").length,
        });

        // Bấm nút next (bỏ phần kiểm tra kỹ "Next")
        const [{ result: hasNext }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const nextBtn = document.querySelector(".pagination-container .pagination-nav a:last-child");
                if (!nextBtn || nextBtn.textContent.trim() !== "Next") return false;
                nextBtn.click();
                return true;
            }
        });

        if (!hasNext) break;

        await sleep(2000);  // 2 giây

        // Đợi URL thay đổi hoặc list thay đổi, timeout 30s
        const oldUrl = updatedTab.url;
        try {
            await Promise.race([
                waitForListChange(tab.id, oldCount, 30000),
                waitForUrlChange(oldUrl, tab.id, 30000)
            ]);
        } catch (err) {
            console.warn("Warning:", err.message);
            // Vẫn tiếp tục chạy nếu timeout
        }

        if (i === MAX_PAGES - 1) {
            chrome.runtime.sendMessage({ status: "done" }).catch(() => { });
        }
    }

    if (!stopRequested) chrome.runtime.sendMessage({ status: "done" }).catch(() => { });
}

async function crawlDiscussionDetails(examName) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const examRes = await fetch(chrome.runtime.getURL(`data/${examName}.json`));
    if (!examRes.ok) {
        throw new Error(`Failed to fetch exam data for ${examName}`);
    }

    const examData = await examRes.json();
    const examItems = examData.items || [];

    for (const item of examItems) {
        if (stopRequested) {
            chrome.runtime.sendMessage({ status: "stopped" }).catch(() => { });
            return;
        }

        const discussionUrl = item.link;
        if (!discussionUrl) continue;

        try {
            // Mở URL trong tab hiện tại
            const updatedTab = await chrome.tabs.update(tab.id, { url: discussionUrl });

            // Đợi trang load hoàn tất
            await waitForPageLoad(tab.id, 10000); // max 10s

            // Lấy dữ liệu từ trang
            const [{ result: discussionHTML }] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    return document.querySelector(".sec-spacer  ")?.innerHTML || "";
                }
            });

            console.log(`✔ Crawled: ${discussionUrl}`);

            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            const safeTitle = sanitizeFilename(item.title);
            const filename = `ExamTopic/discussion-details/${examName}/discussion_${safeTitle}_${timestamp}.json`;
            console.log(`Saving to: ${filename}`);
            const dataWithMeta = {
                crawledAt: timestamp,
                url: discussionUrl,
                title: item.title,
                html: discussionHTML
            };

            const jsonStr = JSON.stringify(dataWithMeta, null, 2);
            const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
            const dataUrl = `data:application/json;base64,${base64}`;

            await chrome.downloads.download({
                url: dataUrl,
                filename,
                saveAs: false
            });

            await sleep(1000); // Đợi 2 giây trước khi tiếp tục
        } catch (err) {
            console.warn(`⚠️ Lỗi khi xử lý ${discussionUrl}: ${err.message}`);
            continue; // Tiếp tục discussion tiếp theo
        }
    }

    if (!stopRequested) {
        chrome.runtime.sendMessage({ status: "done" }).catch(() => { });
    }
}


chrome.runtime.onInstalled.addListener(() => {
    console.log("Crawl extension installed");
});

// chrome.runtime.onStartup.addListener(() => {
//     console.log("Crawl extension started");
// });

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function sanitizeFilename(name) {
    // return name.replace(/[<>:"/\\|?*]+/g, "_").slice(0, 100); // Giới hạn độ dài
    return name
        .replace(/[<>:"/\\|?*\n\r]+/g, "_") // loại bỏ ký tự cấm + dòng mới
        .replace(/\s+/g, "_")               // thay khoảng trắng bằng gạch dưới
        .slice(0, 100);                     // tránh tên file quá dài
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function waitForPageLoad(tabId, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();

        function check() {
            chrome.tabs.get(tabId, (tab) => {
                if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);

                if (tab.status === "complete") {
                    resolve();
                } else if (Date.now() - start > timeout) {
                    reject(new Error("Timeout loading page"));
                } else {
                    setTimeout(check, 500);
                }
            });
        }

        check();
    });
}
