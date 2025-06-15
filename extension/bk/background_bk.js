let stopRequested = false;
let crawlStatus = "idle"; // idle | crawling | stopped | done

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "startCrawl") {
        stopRequested = false;
        crawlStatus = "crawling";
        crawlPages();
    } else if (message.action === "stopCrawl") {
        stopRequested = true;
        crawlStatus = "stopped";
    } else if (message.action === "getStatus") {
        sendResponse({ status: crawlStatus });
    }
});

async function crawlPages() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    for (let i = 0; i < 100; i++) {
        if (stopRequested) {
            crawlStatus = "stopped";
            return;
        }

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
        const filename = `crawled${path}_${timestamp}.json`;

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

        const [{ result: hasNext }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const nextBtn = document.querySelector(".pagination-container .pagination-nav a:last-child");
                if (!nextBtn) return false;
                if (nextBtn.textContent.trim() !== "Next") return false;
                nextBtn.click();
                return true;
            }
        });

        if (!hasNext) break;
        await new Promise(r => setTimeout(r, 4000));
    }

    if (!stopRequested) {
        crawlStatus = "done";
        chrome.runtime.sendMessage({ status: "done" });
    }
}
