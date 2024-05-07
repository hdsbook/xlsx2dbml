## 使用方式

```
npm install
node main.js
```

## 功能說明

- 執行後，程式會讀取schema.xlsx，產生三個檔案：
    - [./outputFiles/schema.dbml](./outputFiles/schema.dbml) (DBML檔案)
    - [./outputFiles/匯出報表.xlsx](./outputFiles/匯出報表.xlsx)
    - [./outputFiles/匯出資訊.txt](./outputFiles/匯出資訊.txt)

- DBML檔案產關聯圖的方式有兩種，兩種都會需要至 [https://dbdiagram.io/d](https://dbdiagram.io/d) 註冊帳號
    1. 貼到 [https://dbdiagram.io/d](https://dbdiagram.io/d) 去產關聯圖
    2. 用 dbdocs 建立靜態報表網頁，詳細說明請閱讀 [README2-DBDOCS說明.md](./README2-DBDOCS說明.md)



## 設定檔 config.json

> 檔案位置：[./config.json](./config.json)

|            設定參數 | 說明                                                                            |
| ------------------: | ------------------------------------------------------------------------------- |
|        filterTables | 篩選只要產出哪些table的內容，ex: `["COURSE", "COURSE_TYPE"]`，空陣列為不篩選    |
|      readFromGoogle | 是否從google sheet讀取，true則從google sheet讀取，false則從檔案讀取             |
| googleSpreadSheetId | (readFromGoogle = true) google 工作表ID                                         |
|     googleSheetName | (readFromGoogle = true) google 工作表名稱                                       |
|       inputFilePath | (readFromGoogle = false) 匯入檔路逕，預設值 `schema.xlsx`                       |
|  outputDBMLFileName | 匯出檔名稱(DBML檔案)，預設值 `schema.dbml`                                      |
|  outputXlsxFileName | 匯出檔名稱(報表)，預設值 `匯出報表.xlsx`                                        |
|        schemaTitles | 可以客製化 輸入資料 的標題文字                                                  |
|         reportStyle | 可以客製化 報表 的匯出樣式                                                      |
|      autoOpenReport | 是否於成功匯出報表後自動開啟報表                                                |
|           excelPath | 設定excel執行檔路逕，此設定有值且 autoOpenReport = true，則報表匯出後會自動開啟 |

## Tips 
- schema.xlsx 的欄位格式順序不一定要和範本一樣，只要設定好 schemaTitles 即可
- schema.xlsx 可以放全系統的資料表，用 filterTables 參數篩選要的資料表產DBML
- 可先設 filterTables 為空陣列，執行後 [./outputFiles/匯出資訊.txt](./outputFiles/匯出資訊.txt) 會有匯出清單，再從清單中擷取要的資料表貼回 filterTables 設定
- 若資料夾中有兩個以上的config (如：`config.json`, `config_2.json`, `config_xxx.json`)，則執行時可以選擇要用哪個設定檔匯出





