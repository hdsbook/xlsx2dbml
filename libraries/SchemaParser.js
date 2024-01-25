/**
 * schema.xlsx 解析物件
 */
const SchemaParser = function ({ workbook, config }) {
    const that = this;

    // 初始化 tables 物件
    that.tables = that.InitTables(workbook, config);
}

SchemaParser.prototype.InitTables = function (workbook, config) {
    const that = this;

    
    const {filterTables, schemaTitles} = config;

    // 讀取並解析 Excel 資料
    const rawDataList = that.GetRawDataList(workbook);

    let tables = {};
    let hasFilterTables = filterTables.length > 0;
    rawDataList.forEach(row => {
        const tableName = row[schemaTitles.tableName];
        const note = row[schemaTitles.chinese] ?? '';
        const fieldName = row[schemaTitles.english] ?? '';
        const dataType = row[schemaTitles.dataType] ?? '';
        const isPK = row[schemaTitles.primaryKey] ?? '';
        const isNN = row[schemaTitles.notNull] ?? '';
        const defaultValue = row[schemaTitles.default] ?? '';
        const isUnique = row[schemaTitles.unique] ?? '';
        const reference = row[schemaTitles.reference] ?? '';

        // 篩選資料表
        if (hasFilterTables && filterTables.indexOf(tableName) == -1) {
            return;
        }

        if (!tables[tableName]) {
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

SchemaParser.prototype.GetRawDataList = function (workbook) {
    const rawDataList = [];
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
            rawDataList.push(rowData);
        });
    })
    return rawDataList;
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