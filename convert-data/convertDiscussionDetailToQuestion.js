const fs = require('fs');
const { JSDOM } = require('jsdom');
const path = require('path');

// const exam = "AWS Certified Developer - Associate DVA-C02";
// const exam = "AWS Certified Solutions Architect - Professional SAP-C02";
// const exam = "AWS Certified SysOps Administrator - Associate";
// const exam = "AWS Certified Database - Specialty";
// const exam = "AWS Certified DevOps Engineer - Professional DOP-C02";
// const exam = "AWS Certified Data Engineer - Associate DEA-C01";
// const exam = "AWS Certified Security - Specialty SCS-C02";
// const exam = "AWS Certified Solutions Architect - Associate SAA-C03";
const exams = [
    // "AWS Certified Developer - Associate DVA-C02",
    // "AWS Certified Solutions Architect - Professional SAP-C02",
    "AWS Certified SysOps Administrator - Associate",
    // "AWS Certified Database - Specialty",
    // "AWS Certified DevOps Engineer - Professional DOP-C02",
    // "AWS Certified Data Engineer - Associate DEA-C01",
    // "AWS Certified Security - Specialty SCS-C02",
    // "AWS Certified Solutions Architect - Associate SAA-C03"
];

start();

async function start() {
    for (const exam of exams) {
        console.log(`Bắt đầu xử lý ${exam}`);
        // Thư mục chứa các file JSON
        const folderPath = path.join(__dirname, 'discussion-details', exam);

        // Mảng chứa toàn bộ items sau khi merge

        // convert to read sync
        if (!fs.existsSync(folderPath)) {
            console.error(`Thư mục ${folderPath} không tồn tại. Vui lòng kiểm tra lại.`);
            console.error(`Bỏ qua ${exam} vì không tìm thấy thư mục.`);
            continue;
        }

        // convert to read async
        const files = fs.readdirSync(folderPath);
        let questionItems = [];

        if (files.length === 0) {
            console.warn(`Thư mục ${folderPath} không có file nào.`);
            continue;
        }

        console.log(`Đang đọc ${files.length} file(s) trong thư mục ${folderPath}`);
        files
            .filter(file => file.endsWith('.json')) // chỉ lấy file .json
            .forEach(file => {
                const filePath = path.join(folderPath, file);
                console.log(`Đang xử lý file: ${filePath}`);
                try {
                    const data = fs.readFileSync(filePath, 'utf8');
                    const json = JSON.parse(data);

                    const item = handleItem(json);
                    questionItems.push(item);
                } catch (e) {
                    console.error(`Lỗi đọc hoặc parse file ${file}:`, e.message);
                }
            });

        questionItems = questionItems.sort((a, b) => {
            return a.id - b.id; // Sắp xếp theo id
        });

        saveQuestions(questionItems, exam);
    }
}

function handleItem(item) {
    let html = item.html || '';
    html = html.replace(/<style[\s\S]*?<\/style>/gi, '');
    const title = item.title || '';

    const references = [item.url];

    const questionNumber = extractQuestionNumber(title);

    // Chuyển đổi item từ HTML sang JSON
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const questionBodyEl = document.querySelector('div.question-body');
    const question = questionBodyEl.querySelector("p.card-text").innerHTML || '';
    const answerEls = questionBodyEl.querySelectorAll(".question-choices-container .multi-choice-item");
    const domain = '';

    const answers = Array.from(answerEls).map((el, index) => {
        const multiChoiceLetterEl = el.querySelector('.multi-choice-letter');
        if (multiChoiceLetterEl) multiChoiceLetterEl.remove(); // Xóa phần chữ cái (A, B, C, D)
        const mostVotedAnswerBadgeEl = el.querySelector('.most-voted-answer-badge');
        if (mostVotedAnswerBadgeEl) mostVotedAnswerBadgeEl.remove(); // Xóa phần "most-voted-answer-badge"

        const answerText = el.innerHTML || '';
        const isCorrect = el.className.includes('correct-hidden');

        return {
            id: index + 1,
            answer: answerText.replace(/\n|\t/g, ''),
            correct: isCorrect
        };
    });

    const answerMaps = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const selectedAnswerLetter = answers.map((answer, index) => {
        return answer.correct ? answerMaps[index] || '' : '';
    }).filter(letter => letter !== '').join('');

    const commentContainers = document.querySelectorAll('.discussion-container .comment-container');

    Array.from(commentContainers).forEach(container => {
        const commentSelectedAnswers = container.querySelector(".comment-selected-answers span")?.textContent || '';
        if (commentSelectedAnswers === selectedAnswerLetter) {
            const commentContent = container.querySelector(".comment-content")?.textContent || '';
            // extract multiple link from commentContent
            const linkMatches = commentContent.match(/https?:\/\/[^\s]+/g);
            // check if domain is not equal aws.amazon.com then skip
            if (linkMatches && linkMatches[0] && (linkMatches[0].includes('aws.amazon.com') || linkMatches[0].includes('aws.github.io'))) {
                references.push(linkMatches[0]);
            }
        }
    });

    // remote duplicate references
    const uniqueReferences = Array.from(new Set(references));

    const corrects = answers.filter(answer => answer.correct).map(answer => answer.id);

    // Trả về đối tượng item đã chuyển đổi
    return {
        id: questionNumber,
        question: question.replace(/\n|\t/g, ''),
        answers: answers,
        corrects: corrects,
        multiple: corrects.length > 1,
        domain: domain,
        correctAnswerExplanations: [],
        incorrectAnswerExplanations: [],
        references: uniqueReferences
    };
}

function saveQuestions(questions, examName) {
    writeFileSync(`questions/${examName}.json`, questions);
}

function writeFileSync(filename, data) {
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`Đã ghi vào ${filename}`, data.length, 'items');
}

function extractQuestionNumber(title) {
    const match = title.match(/question\s+(\d+)\s+discussion/i);
    return match ? parseInt(match[1]) : null;
}