// let stopRequested = false;

// chrome.runtime.onConnect.addListener(function (port) {
//   if (port.name !== "crawl") return;

//   port.onMessage.addListener(async function (msg) {
//     if (msg.action === "start") {
//       stopRequested = false;
//       const data = [];

//       async function wait(ms) {
//         return new Promise(resolve => setTimeout(resolve, ms));
//       }

//       async function extractDataFromPage() {
//         const items = document.querySelectorAll(".discussion-list .discussion-row");
//         const pageData = Array.from(items).map(el => ({
//           title: el.querySelector(".discussion-title")?.innerText || "",
//           link: el.querySelector(".discussion-title a")?.href || ""
//         }));
//         console.log("Extracted:", pageData);
//         data.push(...pageData);
//       }

//       async function goToNextPage() {
//         const nextBtn = document.querySelector(".pagination-container .pagination-nav a:last-child");
//         if (!nextBtn) {
//           console.log("No next button found.");
//           return false;
//         }

//         const nextBtnText = nextBtn.textContent.trim();
//         if (nextBtnText !== "Next") {
//           console.log("Next button text is not 'Next':", nextBtnText);
//           return false; // Nếu nút next không có chữ "Next", dừng
//         }

//         const hrefAttr = nextBtn.getAttribute("href");
//         if (!hrefAttr) {
//           console.log("Next button has no href attribute.");
//           return false;
//         }

//         const hrefPaths = hrefAttr.split("/").filter(Boolean); // loại bỏ chuỗi rỗng
//         if (hrefPaths.length < 1) {
//           console.log("Href path invalid:", hrefAttr);
//           return false;
//         }

//         // Lấy số trang cuối cùng (giả định là số trang)
//         const lastSegment = hrefPaths[hrefPaths.length - 1];
//         const secondLastSegment = hrefPaths[hrefPaths.length - 2] || "0";

//         const lastPageNum = parseInt(lastSegment, 10);
//         const secondLastPageNum = parseInt(secondLastSegment, 10);

//         // Nếu không phải số hoặc lớn hơn 5 thì dừng crawl
//         if ((isNaN(lastPageNum) ? 0 : lastPageNum) > 5 || (isNaN(secondLastPageNum) ? 0 : secondLastPageNum) > 5) {
//           console.log("Page number > 5, stop crawling");
//           return false;
//         }

//         nextBtn.click();
//         await wait(2000); // đợi trang load
//         return true;
//       }

//       while (!stopRequested) {
//         await extractDataFromPage();
//         const hasNext = await goToNextPage();
//         if (!hasNext) break;
//       }

//       port.postMessage({ status: "done", data });
//     }

//     if (msg.action === "stop") {
//       console.log("Stop requested!");
//       stopRequested = true;
//     }
//   });
// });
