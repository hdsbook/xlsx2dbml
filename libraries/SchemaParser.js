const ExcelJS = require('exceljs');

/**
 * 解析 schema.xlsx 或 GoogleSheet
 * 轉成統一原始資料格式 [{標題: 值}, {標題: 值}, ...]
 * 再轉成tables物件 [
 *  {tableName: {tableNote: 資料表註解, tableFields: [{fieldName, dataType, note, isPK, isNN, defaultValue, isUnique, reference}, ...]}}, ...
 * ]
 */
const SchemaParser = function (filterTables, schemaTitles, autoFixFKs) {
    const that = this;

    that.filterTables = filterTables;
    that.schemaTitles = schemaTitles;
    that.autoFixFKs = autoFixFKs;
    that.headerNames = {};
    that.rawDataList = [];
}

SchemaParser.prototype.SetRawDataList = function (rawDataList) {
    const that = this;

    that.rawDataList = rawDataList;

    // 初始化 tables 物件
    that.tables = that.RawDataToTables(rawDataList);

    // 是否自動修正外鍵問題(自動移除沒有加入的資料表的外鍵)
    if (that.autoFixFKs) {
        const tableNames = that.GetTableNames();

        // 所有有設定外鍵關聯的欄位
        const allRefFields = that.GetAllFields()
            .filter(field => field.reference)
            .map(field => {
                const refSplit = field.reference.split('.')
                return {
                    tableName: field.tableName,
                    fieldName: field.fieldName,
                    fkTableName: refSplit[0],
                    fkFieldName: refSplit[1]
                }
            });

        // 外鍵Table不存在的外鍵
        const tableNotIncludedRefs = allRefFields
            .filter(ref => !tableNames.includes(ref.fkTableName));

        // 修正：取消外鍵值
        tableNotIncludedRefs.forEach(ref => {
            that.tables[ref.tableName].tableFields.forEach(field => {
                if (field.fieldName == ref.fieldName) {
                    field.reference = '';
                }
            })
        })
    }

    // 檢查若有異常，顯示Log
    that.LogErrorIfNeeded(rawDataList);
}

SchemaParser.prototype.SetDataByGoogleSheetReader = async function (googleSheetReader, googleSheetName) {
    const that = this;

    // 從GoogleSheet讀取資料
    sheetRows = await googleSheetReader.GetSheetRows(googleSheetName);

    // 轉換為原始資料清單 [{標題: 值}, {標題: 值}, ...]
    const rawDataList = [];
    sheetRows.forEach(row => {
        const rawData = {};
        row.forEach(cell => {
            const { title, value } = cell;
            rawData[title] = value;
        })
        rawDataList.push(rawData);
    });
    that.SetRawDataList(rawDataList);
}

SchemaParser.prototype.SetDataByFile = async function (inputFilePath) {
    const that = this;

    // 從本機端檔案讀取資料
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(inputFilePath);

    // 轉換成原始資料清單 [{標題: 值}, {標題: 值}, ...]
    const rawDataList = [];
    workbook.eachSheet(sheet => {
        sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {

            const rowData = {};
            row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                if (rowNumber == 1) { // 第一列標題
                    that.headerNames[colNumber] = cell.text.toString().trim();
                } else {
                    const headerName = that.headerNames[colNumber];
                    rowData[headerName] = cell.text.toString().trim();
                }
            });
            rawDataList.push(rowData);
        });
    })
    that.SetRawDataList(rawDataList);
}

// 轉換原始資料為 tables 物件
SchemaParser.prototype.RawDataToTables = function (rawDataList) {
    const that = this;

    let tables = {};
    let hasFilterTables = that.filterTables.length > 0;
    rawDataList.forEach(row => {
        const tableName = row[that.schemaTitles.tableName];
        const note = row[that.schemaTitles.chinese] ?? '';
        const fieldName = row[that.schemaTitles.english] ?? '';
        const dataType = row[that.schemaTitles.dataType] ?? '';
        const isPK = row[that.schemaTitles.primaryKey] ?? '';
        const isNN = row[that.schemaTitles.notNull] ?? '';
        const defaultValue = row[that.schemaTitles.default] ?? '';
        const isUnique = row[that.schemaTitles.unique] ?? '';
        const reference = row[that.schemaTitles.reference] ?? '';
        const ignore = row[that.schemaTitles.ignore] ?? '';

        if (ignore) {
            return; // 忽略的資料列
        }

        // 篩選資料表
        if (hasFilterTables && that.filterTables.indexOf(tableName) == -1) {
            return;
        }

        if (tableName && !tables[tableName]) {
            tables[tableName] = {
                'tableNote': note,
                'tableFields': []
            };
        }

        const isFieldRow = tableName && fieldName && dataType;
        if (isFieldRow) {
            tables[tableName].tableFields.push({
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
    return tables;
}

// 驗證解析結果是否有異常之處，如果有的話，給予警示方便發現錯誤
SchemaParser.prototype.LogErrorIfNeeded = function () {
    const that = this;

    const hasNoTables = that.GetTableNames().length == 0;
    if (hasNoTables) {
        console.error(`\n讀取結果沒有任何資料表，請檢查filterTables設定或來源檔案內容\n`);
    } else {
        const hasNoFields = that.GetAllFields().length == 0;
        if (hasNoFields) {
            const configHeaders = Object.values(that.schemaTitles);
            const fileHeaders = Object.values(that.headerNames);
            const notExistHeaders = configHeaders.filter(name => !fileHeaders.includes(name));

            if (notExistHeaders.length > 0) {
                console.error(`\n提示，資料來源檔案缺少以下標題：${notExistHeaders.join(', ')}\n`);
            }
        }
    }
}

SchemaParser.prototype.GetTableNames = function () {
    const that = this;
    return Object.keys(that.tables);
}
SchemaParser.prototype.GetTableNotes = function () {
    const that = this;
    return Object.entries(that.tables).map(([tableName, { tableFields, tableNote }]) => tableNote);
}
SchemaParser.prototype.GetAllFields = function () {
    const that = this;
    return Object.entries(that.tables).flatMap(([tableName, { tableFields, tableNote }]) => {
        tableFields.forEach(field => {
            field.tableName = tableName;
            field.tableNote = tableNote;
        })
        return tableFields;
    });
}

SchemaParser.prototype.GetDBMLContent = function (dbmlProjectName, dbmlProjectNote) {
    const that = this;

    dbmlProjectNote = dbmlProjectNote || dbmlProjectName;

    // 生成 DBML 語法
    let dbmlContent =
        `Project ${dbmlProjectName}{
database_type: 'Oracle'
Note: '''
    ### ${dbmlProjectNote}
'''
}\n\n`;
    let allFields = that.GetAllFields();
    let maxNameLength = Math.max(...allFields.map(x => x.fieldName.length)); // 最長欄位名稱長度
    let maxTypeLength = Math.max(...allFields.map(x => x.dataType.length));  // 最長資料型態長度
    Object.entries(that.tables).forEach(([tableName, { tableNote, tableFields }]) => {
        if (tableFields.length == 0) {
            return;
        }

        dbmlContent += `Table ${tableName}`;
        if (tableNote) {
            dbmlContent += ` [note: '${tableNote}']`;
        }

        dbmlContent += ` {\n`;
        tableFields.forEach(column => {
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

    return dbmlContent;
}

module.exports = SchemaParser;