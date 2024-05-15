const fs = require('fs');
const SchemaParser = require('./libraries/SchemaParser.js');
const DBMLReporter = require('./libraries/DBMLReporter.js');
const command = require('./libraries/Command.js');
const GoogleSheetReader = require('./libraries/GoogleSheetReader.js');

const main = async function (configFileName) {
    // 讀取設定 ------------------------------------------------------------------------
    const config = JSON.parse(fs.readFileSync(`./${configFileName}`));                    // 設定檔位置
    const schemaTitles = config.schemaTitles;                                             // 欄位標題
    const filterTables = config.filterTables;                                             // 是否篩選資料表
    const reportPath = './outputFiles/' + (config.outputXlsxFileName || "匯出報表.xlsx");  // 匯出 報表 路逕
    const dbmlPath = './outputFiles/' + (config.outputDBMLFileName || "schema.dbml");     // 匯出 .dbml 路逕
    const infoPath = './outputFiles/匯出資訊.txt';                                         // 匯出 .txt 路逕
    const dbmlProjectName = config.dbmlProjectName || 'TEST';                             // 匯出 .dbml 中的專案名稱
    const reportStyle = config.reportStyle || {                                           // 報表預設樣式
        "fontSize": 12,
        "fontName": "微軟正黑體",
        "englishFontName": "Arial",
        "columnWidth": {
            "A": 30,
            "B": 20,
            "C": 10,
            "D": 30
        }
    };

    // 讀取設定：是否於匯出後自動開啟報表檔案
    const autoOpenReport = config.autoOpenReport;                                     // 是否於匯出後自動開啟excel
    const excelPath = config.excelPath;                                               // excel應用程式安裝位置

    // 讀取設定：從檔案or從google讀取資料
    const readFromGoogle = config.readFromGoogle;                                     // 是否從google讀取schema
    const inputFilePath = config.inputFilePath || "schema.xlsx";                      // 從檔案讀取：匯入檔 路逕
    const googleSpreadSheetId = config.googleSpreadSheetId;                           // 從google讀取：google excel 文件id
    const googleSheetName = config.googleSheetName;                                   // 從google讀取：google excel 要讀取的工作表名稱
    const googleCredential = config.readFromGoogle ?                                  // 從google讀取：google api credential
        JSON.parse(fs.readFileSync('googleCredential.json')) :
        {};

    const autoFixFKs = config.autoFixFKs || false; // 是否自動修正外鍵錯誤(移除沒有對應資料表的外鍵)



    // 讀取資料 ------------------------------------------------------------------------
    const parser = new SchemaParser(filterTables, schemaTitles, autoFixFKs);
    if (readFromGoogle) {
        const reader = new GoogleSheetReader(googleSpreadSheetId, googleCredential);
        await parser.SetDataByGoogleSheetReader(reader, googleSheetName);
    } else {
        await parser.SetDataByFile(inputFilePath);
    }

    // 匯出資料 ------------------------------------------------------------------------
    // 匯出：資料表清單
    let tableNames = parser.GetTableNames();
    let tableNotes = parser.GetTableNotes();
    let infoContent = `${JSON.stringify(tableNames, null, '\t')}\n${tableNotes.join('\n')}`;
    fs.writeFileSync(infoPath, infoContent, 'utf-8');
    console.log(`已匯出資訊至: ${infoPath}`);

    // 匯出：DBML
    const dbmlContent = parser.GetDBMLContent(dbmlProjectName);
    fs.writeFileSync(dbmlPath, dbmlContent, 'utf-8');
    console.log(`已匯出DBML至: ${dbmlPath}`);

    // 匯出：報表(讀取schema.dbml，匯出報表)
    const reporter = new DBMLReporter(dbmlPath);
    reporter.ExportReport(reportPath, reportStyle)
        .then(() => {
            console.log(`已匯出報表至: ${reportPath}`);
            if (autoOpenReport && excelPath) {
                command.OpenExcel(reportPath, excelPath)
            }
        })
}


try {
    // 設定檔 (config*.js, ex: config_B2B.js, config_SRM.js...) 
    const configFileNames = fs.readdirSync(__dirname).filter(file => file.startsWith('config') && file.endsWith('.json'));
    switch (configFileNames.length) {
        case 0:
            console.error('找不到設定檔');
            break;
        case 1:  // 只有一個設定檔
            main(configFileNames[0]);
            break;
        default: // 有多個設定檔，可以選擇要以哪個設定檔執行
            command.ChooseConfig(configFileNames).then(configFileName => main(configFileName));
            break;
    }
} catch (error) {
    console.error("發生意外的錯誤：" + error.message);
    process.exit(0);
}
