const fs = require('fs');
const { Parser: DBMLParser } = require('@dbml/core');
const ExcelJS = require('exceljs');


/**
 * 報表物件 (解析schema.dbml，產生報表)
 */
const DBMLReporter = function (dbmlFilePath) {
    const that = this;

    const dbmlContent = fs.readFileSync(dbmlFilePath, 'utf-8');
    try {
        // 讀取並解析DBML檔案為database物件
        that.database = (new DBMLParser()).parse(dbmlContent, 'dbml');
    } catch (error) {
        that.HandleParseError(error, dbmlFilePath, dbmlContent);
    }
}

DBMLReporter.prototype.HandleParseError = function (error, dbmlFilePath, dbmlContent) {
    const { start, end } = error.location;
    const lines = dbmlContent.split('\n');
    const errorLines = lines.slice(start.line - 1, end.line);

    console.error('DBML parse error:');
    console.error(`錯誤檔案：${dbmlFilePath}:`);
    console.error(`錯誤行數：${start.line}:`);
    console.error(errorLines.join('\n') + '\n');
    console.error(`錯誤訊息：${error.message}`);
    process.exit(0);
}

// 取得關聯對應 (欄位A -> 欄位B)
DBMLReporter.prototype.GetRefDic = function () {
    const that = this;

    let refDic = {};
    that.database.schemas.every(schema => {
        let refs = schema.refs;
        refs.forEach(ref => {
            // 關聯方向為： * -> 1
            const isFrom0To1 = ref.endpoints[0].relation == '*' && ref.endpoints[1].relation == '1';

            const fromFieldObj = isFrom0To1 ? ref.endpoints[0] : ref.endpoints[1];
            const toFieldObj = isFrom0To1 ? ref.endpoints[1] : ref.endpoints[0];

            let toFieldName = toFieldObj.tableName + '.' + toFieldObj.fieldNames[0];
            let fromFieldName = fromFieldObj.tableName + '.' + fromFieldObj.fieldNames[0]

            if (!refDic[fromFieldName]) {
                refDic[fromFieldName] = [];
            }
            if (refDic[fromFieldName].indexOf(toFieldName) == -1) {
                refDic[fromFieldName].push(toFieldName)
            }
        })
    })
    return refDic;
}

// 將資料表關聯log出來
DBMLReporter.prototype.LogReferences = function () {
    const that = this;

    that.database.schemas.every(schema => {
        let refs = schema.refs;
        refs.forEach(ref => {
            let fromFieldObj = ref.endpoints[0];
            let toFieldObj = ref.endpoints[1];

            let fromFieldName = fromFieldObj.tableName + '.' + fromFieldObj.fieldNames[0];
            let toFieldName = toFieldObj.tableName + '.' + toFieldObj.fieldNames[0]

            let relation = '';
            if (fromFieldObj.relation == '1' && toFieldObj.relation == '1') {
                relation = '-';
            } else {
                if (toFieldObj.relation == '*') relation += '<';
                if (fromFieldObj.relation == '*') relation += '>';
            }
            console.log(fromFieldName + ' ' + relation + ' ' + toFieldName);
        })
    })
}

// 產生報表資料 (多個sheet，每個sheet是一張表)
DBMLReporter.prototype.GenerateReportSheetsData = function () {
    const that = this;

    const refDic = that.GetRefDic();

    const sheets = [];
    that.database.schemas.every(schema => {
        let tables = schema.tables;
        tables.forEach(table => {
            const fields = [];
            const fkSettings = {};

            // 取得 PK 欄位 (多主鍵情況)
            const pkIndexes = (table.indexes && table.indexes.length > 0)
                ? table.indexes.filter(index => index.pk).flatMap(index => index.columns).map(column => column.value)
                : [];

            // 取得 PK 欄位 (單一主鍵情況)
            const otherPks = table.fields.filter(field => field.pk).map(column => column.name);

            const pkKeys = [...new Set([...otherPks, ...pkIndexes])];

            table.fields.forEach(field => {
                //let schema = schema.name;
                let fieldSettings = [];
                if (pkKeys.indexOf(field.fieldName) != -1) fieldSettings.push('PK');
                if (field.not_null) fieldSettings.push('NN');

                let fromFieldName = table.name + '.' + field.name;
                let toFieldNames = refDic[fromFieldName] ? refDic[fromFieldName] : [];
                if (toFieldNames.length > 0) {
                    const toTableName = toFieldNames[0].split('.')[0];
                    fkSettings[field.name] = {
                        fkName: table.name + '_' + toTableName + '_FK',
                        usedColumns: toFieldNames
                    };
                }

                fields.push({
                    tableName: table.name,
                    tableNote: table.note,
                    A: field.name,
                    B: field.type.type_name,
                    C: field.not_null ? 'TRUE' : 'FALSE',
                    D: field.note,
                    // E: fieldSettings.join(', '),
                    // F: toFieldNames.join('\n')
                });
            })

            sheets.push(fields);

            // 如有主鍵，新增主鍵索引描述
            if (pkKeys.length > 0) {
                fields.push({}); // 新增空列

                fields.push({
                    A: "Field Name",
                    B: "Index state",
                    C: "Used columns",
                    D: "Index expression"
                });
                const pkUsedColumns = pkKeys.map(pkFieldName => `${table.name}.${pkFieldName}`).join(', ')
                fields.push({
                    A: `${table.name}_PK`,
                    B: "Primary Constraint",
                    C: pkUsedColumns,
                    D: ""
                });
            }

            // 如有外鍵，新增外鍵索引描述
            if (Object.keys(fkSettings).length > 0) {
                fields.push({}); // 新增空列
                fields.push({
                    A: "Field Name",
                    B: "Used column",
                    C: "Reference column"
                });
                Object.entries(fkSettings).forEach(([fieldName, { fkName, usedColumns }]) => {
                    fields.push({
                        A: fkName,
                        B: fieldName,
                        C: usedColumns.join('\n')
                    });
                })
            }

            fields.push({}); // 新增空列
            fields.push({ A: `Table [${table.name}]${table.note}` });
            // fields.push({}); // 新增空列
            // fields.push({A: table.name});
            // fields.push({A: table.note});
        });
    })

    return sheets;
}

// 匯出xlsx報表
DBMLReporter.prototype.ExportReport = function (xlsxPath, reportStyle) {
    const that = this;

    const sheets = that.GenerateReportSheetsData();
    if (sheets.length == 0) {
        console.error('\n匯出報表失敗，沒有可以匯出的資料！請檢查匯入檔或設定檔內容！\n');
        process.exit(0);
    }

    const workbook = new ExcelJS.Workbook();

    sheets.forEach(fields => {
        let sheetName = fields[0].tableNote;
        if (sheetName.length > 27) {
            sheetName = sheetName.substring(0, 27) + '...';
        }
        const worksheet = workbook.addWorksheet(sheetName);

        // Define headers
        worksheet.columns = [
            { key: 'A', width: reportStyle.columnWidth.A, header: 'Field Name' },
            { key: 'B', width: reportStyle.columnWidth.B, header: 'Data Type' },
            { key: 'C', width: reportStyle.columnWidth.C, header: 'Mandatory' },
            { key: 'D', width: reportStyle.columnWidth.D, header: 'Description' },
            // { key: 'E', width: 15, header: '設定' },
            // { key: 'F', width: 50, header: '關聯' },
        ];
        worksheet.addRows(fields);
    })

    // 設定字體樣式
    workbook.eachSheet((worksheet) => {
        worksheet.eachRow((row) => {
            let setBold = false;
            row.eachCell((cell, colNumber) => {

                // 將標題部分設為粗體
                if (colNumber == 1 && cell.value == 'Field Name') {
                    setBold = true;
                }

                const fontName = /[\u4e00-\u9fa5]/.test(cell.text)
                    ? (reportStyle.fontName ?? '微軟正黑體') 
                    : (reportStyle.englishFontName ?? 'Arial');

                cell.font = {
                    name: fontName,
                    size: reportStyle.fontSize,
                    bold: setBold
                };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' },
                };
                cell.alignment = {
                    horizontal: 'left',
                    vertical: 'top'
                };
            });
        });
    });

    // Save workbook to file
    return workbook.xlsx.writeFile(xlsxPath).catch(error => {
        console.error('\n匯出報表失敗！');
        if (error.code == 'EBUSY') {
            console.error(`請先關閉檔案 ${xlsxPath}，再進行匯出！`);
        } else {
            console.error(error.message);
        }
        process.exit(0);
    });
}



module.exports = DBMLReporter;