const { google } = require('googleapis');

/**
 * 讀取 Google Sheet 用
 */
const GoogleSheetReader = function (spreadsheetId, credentials) {
    const that = this;

    that.spreadsheetId = spreadsheetId;

    // 創建 OAuth2 客戶端
    const auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    that.googleSheetsObj = google.sheets({ version: 'v4', auth });
}

GoogleSheetReader.prototype.GetSheetRows = async function (filterSheetName) {
    const that = this;

    let sheetNames = [];

    if (filterSheetName) {
        sheetNames = [filterSheetName];
    } else {

        // 取得所有sheet的標題名稱
        const allSheets = (await that.GetAllSheets()).data.sheets;
        if (!allSheets.length) {
            return console.log(`No sheets.`);
        }
        sheetNames = allSheets.map(sheet => sheet.properties.title);
    }

    // 讀取每個sheet的資料
    const promises = await sheetNames.map(async sheetName => {
        const response = await that.GetSheetValuesByRange(sheetName);
        if (!response.data.values.length) {
            return console.log(`No data found in sheet ${sheetName}.`);
        }

        const dataValues = response.data.values;
        const [firstRow, ...otherRows] = dataValues;
        const rows = otherRows.map(row => {
            return row.map((value, index) => ({
                sheetName: sheetName,
                title: firstRow[index],
                value: value
            }));
        });
        return rows; // [{sheetName: 工作表名稱, title: 欄位標題, value: 欄位值}, {sheetName: 工作表名稱, title: 欄位標題, value: 欄位值}, ...]
    });
    const resultOfPromises = await Promise.all(promises);

    // 攤平資料
    const rows = resultOfPromises.flat();
    return rows;
}

GoogleSheetReader.prototype.GetAllSheets = async function () {
    const that = this;

    try {
        const response = await that.googleSheetsObj.spreadsheets.get({
            spreadsheetId: that.spreadsheetId,
        });
        return response;
    } catch (error) {
        console.error('The API returned an error:', error);
        return null;
    }
}
GoogleSheetReader.prototype.GetSheetValuesByRange = async function (range) {
    const that = this;

    try {
        const response = await that.googleSheetsObj.spreadsheets.values.get({
            spreadsheetId: that.spreadsheetId,
            range: range
        });

        return response;
    } catch (error) {
        console.error('The API returned an error:', error);
        return null;
    }
}

module.exports = GoogleSheetReader;
