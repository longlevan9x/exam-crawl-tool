let stopRequested = false;

const statusEl = document.getElementById("status");
const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");

async function crawlMultiplePages() {
    stopRequested = false;

    for (let i = 0; i < 100; i++) {
        if (stopRequested) {
            console.log("🛑 Crawl stopped by user");
            statusEl.textContent = "🛑 Crawl stopped by user.";
            startBtn.disabled = false;
            startBtn.textContent = "Start";
            stopBtn.disabled = true;
            return;
        }

        // ✅ Cập nhật lại tab hiện tại sau mỗi lần chuyển trang
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

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

        // ✅ Lấy lại URL và tạo tên file tương ứng
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const urlObj = new URL(tab.url);
        let path = urlObj.pathname.replace(/\//g, "-") || "root";
        if (path === "-") path = "root";
        const filename = `crawled${path}_${timestamp}.json`;

        const dataWithMeta = {
            crawledAt: timestamp,
            url: tab.url,
            items: pageData
        };

        const jsonStr = JSON.stringify(dataWithMeta, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const urlBlob = URL.createObjectURL(blob);

        await chrome.downloads.download({
            url: urlBlob,
            filename: filename,
            saveAs: false
        });

        URL.revokeObjectURL(urlBlob);

        statusEl.textContent = `Crawled page ${i + 1}, items: ${pageData.length}`;

        // Bấm nút next
        const [{ result: hasNext }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const nextBtn = document.querySelector(".pagination-container .pagination-nav a:last-child");
                if (!nextBtn) return false;

                const hrefAttr = nextBtn.getAttribute("href");
                if (!hrefAttr) return false;

                const hrefPaths = hrefAttr.split("/").filter(Boolean);
                if (hrefPaths.length < 1) return false;

                const lastSegment = parseInt(hrefPaths[hrefPaths.length - 1], 10);
                const secondLast = parseInt(hrefPaths[hrefPaths.length - 2] || "0", 10);

                if (secondLast > 100) return false;
                if (nextBtn.textContent.trim() !== "Next") return false;

                nextBtn.click();
                return true;
            }
        });

        if (!hasNext) break;

        // Chờ trang load
        await new Promise(r => setTimeout(r, 4000));
    }

    if (!stopRequested) {
        statusEl.textContent = "✅ Done crawling.";
        alert("✅ Done crawling all pages.");
    }

    startBtn.disabled = false;
    startBtn.textContent = "Start";
    stopBtn.disabled = true;
}

startBtn.addEventListener("click", () => {
    startBtn.disabled = true;
    startBtn.textContent = "Crawling...";
    stopBtn.disabled = false;
    statusEl.textContent = "Starting crawl...";
    crawlMultiplePages();
});

stopBtn.addEventListener("click", () => {
    stopRequested = true;
    statusEl.textContent = "Stopping crawl...";
});
