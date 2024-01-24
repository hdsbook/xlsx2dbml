const fs = require('fs');
const { Parser: DBMLParser } = require('@dbml/core');
const ExcelJS = require('exceljs');


const DBML2Report = function (filePath) {
    const that = this;

    const dbmlContent = fs.readFileSync(filePath, 'utf-8');
    try {
        that.database = (new DBMLParser()).parse(dbmlContent, 'dbml');
    } catch (error) {
        const { start, end } = error.location;
        const lines = dbmlContent.split('\n');
        const errorLines = lines.slice(start.line - 1, end.line);

        console.error('DBML parse error:');
        console.error(`錯誤檔案：${filePath}:`);
        console.error(`錯誤行數：${start.line}:`);
        console.error(errorLines.join('\n') + '\n');
        console.error(`錯誤訊息：${error.message}`);
    }
}

// 取得關聯對應 (欄位A -> 欄位B)
DBML2Report.prototype.GetRefDic = function () {
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
DBML2Report.prototype.LogRelationships = function () {
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

// 讀取DBML，轉為匯出xlsx報表
DBML2Report.prototype.DBML2Xlsx = function (xlsxPath) {
    const that = this;

    const refDic = that.GetRefDic();

    const sheets = [];
    that.database.schemas.every(schema => {
        let tables = schema.tables;
        tables.forEach(table => {
            const fields = [];
            const fkSettings = {};

            table.fields.forEach(field => {
                //let schema = schema.name;
                let fieldSettings = [];
                if (field.pk) fieldSettings.push('PK');
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
            const pkField = table.fields.find(field => field.pk);
            if (pkField) {
                fields.push({}); // 新增空列

                fields.push({
                    A: "Field Name",
                    B: "Index state",
                    C: "Used columns",
                    D: "Index expression"
                });
                fields.push({
                    A: `${table.name}_PK`,
                    B: "Primary Constraint",
                    C: `${table.name}.${pkField.name}`,
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

    that.ExportXlsx(sheets, xlsxPath);
}


DBML2Report.prototype.ExportXlsx = function (sheets, xlsxPath) {
    const workbook = new ExcelJS.Workbook();

    sheets.forEach(fields => {
        let sheetName = fields[0].tableNote;
        if (sheetName.length > 27) {
            sheetName = sheetName.substring(0, 27) + '...';
        }
        const worksheet = workbook.addWorksheet(sheetName);

        // Define headers
        worksheet.columns = [
            { key: 'A', width: 35, header: 'Field Name' },
            { key: 'B', width: 20, header: 'Data Type' },
            { key: 'C', width: 15, header: 'Mandatory' },
            { key: 'D', width: 30, header: 'Description' },
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
                cell.font = {
                    name: '微軟正黑體',
                    size: 8,
                    bold: setBold
                };

                // 加上 border 樣式
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' },
                };
            });
        });

        // 設定寬度
        worksheet.columns = [
            { width: 30 },
            { width: 20 },
            { width: 10 },
            { width: 30 },
        ];
    });

    // Save workbook to file
    workbook.xlsx.writeFile(xlsxPath)
        .then(() => console.log(`已匯出報表檔案至：${xlsxPath}。`))
        .catch(error => {
            console.error('\n匯出報表失敗！');
            if (error.code == 'EBUSY') {
                console.error(`請先關閉檔案 ${xlsxPath}，再進行匯出！`);
            } else {
                console.error(error.message);
            }
        });
}



module.exports = { DBML2Report };