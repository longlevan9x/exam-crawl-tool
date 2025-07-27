const fs = require('fs');
const { get } = require('http');
const path = require('path');

// Thư mục chứa các file JSON
const folderPath = path.join(__dirname, 'discussions');

// Mảng chứa toàn bộ items sau khi merge
let allItems = [];

// Đọc tất cả các file trong thư mục
fs.readdir(folderPath, (err, files) => {
    if (err) {
        console.error('Lỗi khi đọc thư mục:', err);
        return;
    }

    // const numberArr = [];

    console.log(`Đang đọc ${files.length} file(s) trong thư mục ${folderPath}`);
    files
        .filter(file => file.endsWith('.json')) // chỉ lấy file .json
        .forEach(file => {
            const filePath = path.join(folderPath, file);
            try {
                const data = fs.readFileSync(filePath, 'utf8');
                const json = JSON.parse(data);

                // const match = file.match(/amazon\-+(\d+)\-+_2025/i);
                // const number = match ? match[1] : -1;
                // numberArr.push(number);

                if (Array.isArray(json.items)) {
                    allItems.push(...json.items); // merge items
                } else {
                    console.warn(`File ${file} không có mảng items hợp lệ.`);
                }
            } catch (e) {
                console.error(`Lỗi đọc hoặc parse file ${file}:`, e.message);
            }
        });

    // ✅ Sau khi merge xong: xử lý mảng allItems
    handleItems(allItems);
    // numberArr.sort((a, b) => a - b)
    // console.log(JSON.stringify(numberArr, null, 2));
});

function handleItems(items) {
    console.log(`Tổng số items: ${items.length}`);
    const exams = [
        // { name: 'AWS Certified Developer - Associate DVA-C02' },
        // { name: 'AWS Certified Solutions Architect - Associate SAA-C03' },
        // { name: 'AWS Certified Solutions Architect - Professional SAP-C02' },
        { name: 'AWS Certified SysOps Administrator - Associate' },
        // { name: 'AWS Certified Database - Specialty' },
        // { name: 'AWS Certified DevOps Engineer - Professional DOP-C02' },
        // { name: 'AWS Certified Data Engineer - Associate DEA-C01' },
        // { name: 'AWS Certified Security - Specialty SCS-C02' },

    ];

    for (const exam of exams) {
        console.log('Bắt đầu xử lý ', exam.name);
        getDataList(items, exam.name);
        console.log('Kết thúc xử lý ', exam.name);
        console.log('----------------------------------------');
    }
}

function getDataList(items, examName) {
    // Lọc và xử lý các item phù hợp
    let dataList = items
        .filter(item => {
            const title = item.title || '';
            return title.includes(examName);
        });

    dataList = mapData(dataList);

    writeFileSync(`discussionsOutput/${examName}.json`, dataList);
}

function writeFileSync(filename, data) {
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`Đã ghi vào ${filename}`, data.total, 'items');
}

function mapData(items) {
    items = items
        .map(item => {
            const title = item.title || '';
            const match = title.match(/question\s+(\d+)\s+discussion/i);
            const questionNumber = match ? match[1] : null;

            // Trả về item với trường mới "questionNumber"
            return {
                ...item,
                questionNumber: parseInt(questionNumber)
            };
        });

    console.log(`Số item khớp với tiêu chí: ${items.length}`);

    items = items.sort((a, b) => {
        return (a.questionNumber || 0) - (b.questionNumber || 0);
    });

    // lọc các item có questionNumber trùng lặp
    const uniqueItems = new Map();
    items.forEach(item => {
        if (!uniqueItems.has(item.questionNumber)) {
            uniqueItems.set(item.questionNumber, item);
        }
    });
    items = Array.from(uniqueItems.values());
    console.log(`Số item sau khi lọc trùng lặp: ${items.length}`);
    return { total: items.length, items };
}