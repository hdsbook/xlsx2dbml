const fs = require('fs');
const ExcelJS = require('exceljs');
const { DBML2Report } = require('./libraries/DBML2Report');

// 讀取設定檔
const config = JSON.parse(fs.readFileSync('./config.json'));
const filterTables = config.filterTables;

// input file path
const inputFilePath = config['schemaFileName'] || "schema.xlsx"; 

// output file paths
const outputDBMLPath = './outputFiles/' + (config['outputDBMLFileName'] || "schema.dbml");
const outputXlsxPath = './outputFiles/' + (config['outputXlsxFileName'] || "匯出報表.xlsx");
const infoFilePath = './outputFiles/匯出資訊.txt';

const workbook = new ExcelJS.Workbook();
workbook.xlsx.readFile(inputFilePath).then(() => {
    
    // 讀取並解析 Excel 資料
    const dataList = [];
    workbook.eachSheet(sheet => {
        sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber == 1) {
                return; // 跳過第一列標題
            }
    
            const rowData = {};
            row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                const headerCell = sheet.getCell(1, colNumber);
                const headerName = headerCell.value;
                rowData[headerName] = cell.text.toString().trim();
            });
            dataList.push(rowData);
        });
    })


    // Excel 資料轉換為 tables 物件
    let tables = {};
    let maxNameLength = 0; // 紀錄最長欄位名稱長度(用於美化產出的DBML語法)
    let maxTypeLength = 0; // 紀錄最長欄位型態長度(用於美化產出的DBML語法)
    let hasFilterTables = filterTables.length > 0;
    dataList.forEach(row => {
        const tableName = row[config.titleTableName];
        const note = row[config.titleChinese] ?? '';
        const fieldName = row[config.titleEnglish] ?? '';
        const dataType = row[config.titleDataType] ?? '';
        const isPK = row[config.titlePrimaryKey] ?? '';
        const isNN = row[config.titleNotNull] ?? '';
        const defaultValue = row[config.titleDefault] ?? '';
        const isUnique = row[config.titleUnique] ?? '';
        const reference = row[config.titleReference] ?? '';
        
        // 篩選資料表
        if (hasFilterTables && filterTables.indexOf(tableName) == -1) {
            return; 
        }
        
        if (!tables[tableName]) {
            tables[tableName] = {
                'tableNote': note,
                'tableColumns': []
            };
        }
        
        const isColumnRows = tableName && fieldName && dataType;
        if (isColumnRows) {
            maxNameLength = Math.max(maxNameLength, fieldName.length);
            maxTypeLength = Math.max(maxTypeLength, dataType.length);
    
            tables[tableName].tableColumns.push({
                fieldName,
                dataType,
                note,
                isPK,
                isNN,
                defaultValue,
                isUnique,
                reference
            })
        }
    });

    // 生成 DBML 語法
    let dbmlContent = '';
    Object.entries(tables).forEach(([tableName, { tableNote, tableColumns }]) => {
        if (tableColumns.length == 0) {
            return;
        }

        dbmlContent += `Table ${tableName}`;
        if (tableNote) {
            dbmlContent += ` [note: '${tableNote}']`;
        }

        dbmlContent += ` {\n`;
        tableColumns.forEach(column => {
            let spaces1 = ' '.repeat(maxNameLength - column.fieldName.length + 1);
            let spaces2 = ' '.repeat(maxTypeLength - column.dataType.length + 1);

            let settings = [];
            if (column.isPK) settings.push('pk');
            if (column.isNN) settings.push('not null');
            if (column.defaultValue) settings.push(`default: '${column.defaultValue}'`);
            if (column.note) settings.push(`note: '${column.note}'`);
            if (column.reference) settings.push(`ref: > ${column.reference}`);
            let settingsStr = settings.length > 0 ? `[${settings.join(', ')}]` : '';

            dbmlContent += `\t${column.fieldName}${spaces1}${column.dataType}${spaces2}${settingsStr}\n`;
        });
        dbmlContent += `}\n\n`;
    });

    let dbmlProjectInfo =
`Project TEST{
    database_type: 'Oracle'
    Note: '''
        # TEST Schedule Database
    '''
}\n\n`;

    // 寫入檔案 (生成DBML)
    fs.writeFileSync(outputDBMLPath, dbmlProjectInfo + dbmlContent);
    console.log(`已匯出DBML檔案至：${outputDBMLPath}。`);

    // 匯出報表 (生成報表)
    const converter = new DBML2Report(outputDBMLPath);
    converter.DBML2Xlsx(outputXlsxPath);

    // 匯出資料表清單
    let infoContent = "";
    let tableNames = Object.keys(tables);
    let chineseTableNames = Object.entries(tables).map(([tableName, {tableColumns, tableNote}]) => tableNote);
    infoContent += JSON.stringify(tableNames, null, '\t');
    infoContent += "\n\n\n" + chineseTableNames.join('\n');
    fs.writeFileSync(infoFilePath, infoContent, 'utf-8');
    console.log(`已匯出其它資訊至：${infoFilePath}。`);
});


