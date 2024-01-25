/**
 * schema.xlsx 解析物件
 */
const SchemaParser = function ({ workbook, config }) {
    const that = this;

    that.filterTables = config.filterTables;
    that.schemaTitles = config.schemaTitles;
    that.schemaFileName = config.schemaFileName;
    that.headerNames = {};

    // 初始化 rawDataList
    const rawDataList = that.GetRawDataList(workbook);

    // 初始化 tables 物件
    that.tables = that.RawDataToTables(rawDataList);

    that.LogErrorIfNeeded(rawDataList);
}

// 取得原始資料清單
SchemaParser.prototype.GetRawDataList = function (workbook) {
    const that = this;

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
    return rawDataList;
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
    const hasNoFields = that.GetAllFields().length == 0;
    const isAbnormal = hasNoTables || hasNoFields;

    if (isAbnormal) {
        const configHeaders = Object.values(that.schemaTitles);
        const fileHeaders = Object.values(that.headerNames);
        const notExistHeaders = configHeaders.filter(name => !fileHeaders.includes(name));
        
        if (notExistHeaders.length > 0) {
            console.error(`\n警告！設定檔中 schemaTitles 包含不存在於檔案(${that.schemaFileName})的標題：${notExistHeaders.join(', ')}\n`);
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
    return Object.entries(that.tables).flatMap(([tableName, { tableFields, tableNote }]) => tableFields);
}

SchemaParser.prototype.GetDBMLContent = function (dbmlProjectName) {
    const that = this;

    // 生成 DBML 語法
    let dbmlContent =
        `Project ${dbmlProjectName}{
database_type: 'Oracle'
Note: '''
    # TEST Schedule Database
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