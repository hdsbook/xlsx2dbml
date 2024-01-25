const fs = require('fs');
const ExcelJS = require('exceljs');
const SchemaParser = require('./libraries/SchemaParser');
const DBMLReporter = require('./libraries/DBMLReporter');
const command = require('./libraries/Command.js');

const main = function (configFileName) {
    // 讀取設定檔
    const config = JSON.parse(fs.readFileSync(`./${configFileName}`));

    // input file path
    const inputFilePath = config.schemaFileName || "schema.xlsx";

    // output file paths
    const dbmlPath = './outputFiles/' + (config.outputDBMLFileName || "schema.dbml");
    const reportPath = './outputFiles/' + (config.outputXlsxFileName || "匯出報表.xlsx");
    const infoPath = './outputFiles/匯出資訊.txt';
    const dbmlProjectName = config.dbmlProjectName || 'TEST';

    // excel install path
    const excelPath = config.excelPath;
    const autoOpenReport = config.autoOpenReport;

    const workbook = new ExcelJS.Workbook();
    workbook.xlsx.readFile(inputFilePath).then(() => {

        const schema = new SchemaParser({ workbook, config });

        // 匯出資料表清單
        let tableNames = schema.GetTableNames();
        let tableNotes = schema.GetTableNotes();
        let infoContent = `${JSON.stringify(tableNames, null, '\t')}\n${tableNotes.join('\n')}`;
        fs.writeFileSync(infoPath, infoContent, 'utf-8');
        console.log(`已匯出資訊至: ${infoPath}`);

        // 匯出DBML
        const dbmlContent = schema.GetDBMLContent(dbmlProjectName);
        fs.writeFileSync(dbmlPath, dbmlContent, 'utf-8');
        console.log(`已匯出DBML至: ${dbmlPath}`);

        // 匯出報表
        const reporter = new DBMLReporter(dbmlPath);
        reporter.ExportReport(reportPath)
            .then(() => {
                console.log(`已匯出報表至: ${reportPath}`);
                if (autoOpenReport && excelPath) {
                    command.OpenExcel(reportPath, excelPath)
                }
            })
            .finally(() => {
                // 如果有全域安裝 dbdocs 工具，提供執行選項
                command.CheckGlobalInstallation('dbdocs', isInstalled => {
                    if (isInstalled) {
                        command.ChooseDbdocsCommand(dbmlPath, dbmlProjectName);
                    }
                })
            });
    });
}


try {
    // 若有多個設定檔 (config*.js) 可以選擇要以哪個設定檔執行
    const configFileNames = fs.readdirSync(__dirname).filter(file => file.startsWith('config') && file.endsWith('.json'));
    if (configFileNames.length == 0) {
        console.error('找不到設定檔');
    } else if (configFileNames.length == 1) {
        main(configFileNames[0]);
    } else {
        command.ChooseConfig(configFileNames).then(configFileName => main(configFileName));
    }
} catch (error) {
    console.error("發生意外的錯誤：" + error.message);
    process.exit(0);
}
