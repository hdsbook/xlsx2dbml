## 使用方式

```
npm install
node main.js
```

## 功能說明

- 執行後，程式會讀取schema.xlsx，產生三個檔案：

| 匯出檔案                    | 說明                                                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| ./outputFiles/schema.dbml   | DBML檔案，可用[dbdocs](https://dbdocs.io/)/[dbdiagram](https://dbdiagram.io/d)產生ERD，或用[dbml2sql](https://dbml.dbdiagram.io/cli)轉成SQL檔 |
| ./outputFiles/匯出報表.xlsx | 報表檔案                                                                                                                                      |
| ./outputFiles/匯出資訊.txt  | 紀錄此次匯出共匯出了哪些資料表                                                                                                                |

- 關於用dbdocs建立靜態報表網頁，詳細說明請閱讀 [README2-DBDOCS說明.md](./README2-DBDOCS說明.md)



## 設定檔 config.json

> 檔案位置：[./config.json](./config.json)

|            設定參數 | 說明                                                                            |
| ------------------: | ------------------------------------------------------------------------------- |
|          autoFixFKs | 若設定為true，會自動將沒有對應資料表的外鍵移除                                  |
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
- 篩選資料表的小技巧：
    - 可先設 filterTables 為空陣列先執行一次，空陣列表示不篩選
    - 執行後 `./outputFiles/匯出資訊.txt` 會有匯出清單
    - 再從清單中擷取要的資料表貼回 filterTables 設定再執行第二次
- 若資料夾中有兩個以上的config (如：`config.json`, `config_2.json`, `config_xxx.json`)，則執行時可以選擇要用哪個設定檔匯出
- 若要從google sheet讀取，要另外取得Google憑證，可以參考此[教學](https://hackmd.io/@yy933/SkbnlqhT3#-%E5%8F%96%E5%BE%97Google%E6%86%91%E8%AD%89)
    - 取得憑證後下載改名為 `googleCredential.json` 放到資料夾中
    - config.json調整設定：readFromGoogle = true, 並填入 googleSpreadSheetId, googleSheetName

