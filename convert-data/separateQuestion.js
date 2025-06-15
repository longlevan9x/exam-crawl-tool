const fs = require('fs');
const path = require('path');
// const exam = "AWS Certified Developer - Associate DVA-C02";
// const exam = "AWS Certified Solutions Architect - Professional SAP-C02";
// const exam = "AWS Certified SysOps Administrator - Associate";
// const exam = "AWS Certified Database - Specialty";
// const exam = "AWS Certified DevOps Engineer - Professional DOP-C02";
// const exam = "AWS Certified Data Engineer - Associate DEA-C01";
// const exam = "AWS Certified Security - Specialty SCS-C02";
// const exam = "AWS Certified Solutions Architect - Associate SAA-C03";
const NEXT_COURSE_ID = 22;
const NEXT_EXAM_ID = 97;

const EXAMS = [
    {
        name: "AWS Certified Developer - Associate DVA-C02",
        questionCount: 65,
        folderKey: "examtopic_aws_dva_c02_2025",
        domain: [],
        duration: 130,
        passScore: 72,
        imageUrl: "/images/aws-dva.png",
        description: "AWS Certified Developer - Associate DVA-C02 Study Guide",
        updatedAt: "2025-06-11",
        author: "Internet Academy",
    },
    {
        name: "AWS Certified Solutions Architect - Professional SAP-C02",
        questionCount: 75,
        folderKey: "examtopic_aws_sap_c02_2025",
        duration: 130,
        passScore: 72,
        domains: [],
        imageUrl: "/images/aws-sap.png",
        description: "AWS Certified Solutions Architect - Professional SAP-C02 Study Guide",
        updatedAt: "2025-06-11",
        author: "Internet Academy",
    },
    {
        name: "AWS Certified Solutions Architect - Associate SAA-C03",
        questionCount: 65,
        folderKey: "examtopic_aws_saa_c03_2025",
        duration: 130,
        passScore: 72,
        domains: [],
        imageUrl: "/images/aws-saa.png",
        description: "AWS Certified Solutions Architect - Associate SAA-C03 Study Guide",
        updatedAt: "2025-06-11",
        author: "Internet Academy",
    }
]

// Thư mục chứa các file JSON
const folderPath = path.join(__dirname, 'questions');

let nextExamId = NEXT_EXAM_ID;
let nextCourseId = NEXT_COURSE_ID;
// Mảng chứa toàn bộ items sau khi merge
// Đọc tất cả các file trong thư mục
fs.readdir(folderPath, (err, files) => {
    if (err) {
        console.error('Lỗi khi đọc thư mục:', err);
        return;
    }

    const courses = [];
    const exams = [];
    const examQuestions = [];

    console.log(`Đang đọc ${files.length} file(s) trong thư mục ${folderPath}`);
    for (let index = 0; index < files.length; index++) {
        const file = files[index];

        const filePath = path.join(folderPath, file);
        console.log(`Đang xử lý file: ${file}`);

        try {
            const fileName = path.basename(file, '.json');
            const exam = EXAMS.find(exam => exam.name === fileName);
            const data = fs.readFileSync(filePath, 'utf8');
            const questions = JSON.parse(data);
            const totalQuestions = questions.length;
            const totalFile = Math.round(totalQuestions / exam.questionCount);
            console.log(`Tổng số câu hỏi trong file ${file}: ${totalQuestions}, tổng file: ${totalFile}`);
      
            const course = { ...exam, id: nextCourseId };
            delete course.folderKey;
            const updatedAt = new Date(exam.updatedAt);
            const year = updatedAt.getFullYear();
            course.name = `${course.name} ${year} ${course.author}`;

            courses.push(course);

            for (let i = 0; i < totalFile; i++) {
                const fileName = `${exam.folderKey}/${exam.folderKey}_${i + 1}.json`;

                const examData = {
                    ...exam,
                    id: nextExamId,
                    courseId: course.id,
                    name: course.name + ` - ${i + 1}`,
                };

                delete examData.folderKey;

                exams.push(examData);

                examQuestions.push({
                    "examId": examData.id,
                    "questionFile": fileName
                });

                const start = i * exam.questionCount;
                const end = start + exam.questionCount;
                const questionsSlice = questions.slice(start, end);

                console.log(`Đang ghi vào file: ${fileName}`);
                saveQuestions(questionsSlice, fileName);

                nextExamId++;
            }

            nextCourseId++;

        } catch (e) {
            console.error(`Lỗi đọc hoặc parse file ${file}:`, e);
        }
    }

    // Ghi courses và exams vào file
    writeFileSync('courses.json', courses);
    writeFileSync('exams.json', exams);
    writeFileSync('exam-questions.json', examQuestions);
});


function saveQuestions(questions, fileName) {
    writeFileSync(fileName, questions);
}

function writeFileSync(filename, data) {
    const filePath = `questions_separate/${filename}`;
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true }); // recursive để tạo các folder lồng nhau nếu có
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Đã ghi vào ${filePath}`, data.length, 'items');
}
