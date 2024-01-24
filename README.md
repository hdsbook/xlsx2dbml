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

- DBML檔案的內容可以貼到 https://dbdiagram.io/d 去產關聯圖，或是用 dbdocs 建立靜態報表網頁



## 設定檔 config.json

- 檔案位置：[./config.json](./config.json)
- 設定說明：
    - filterTables 可以篩選只要產出schema.xlsx中哪些table的內容，輸入範例如下：
        ```json
        ["COURSE", "COURSE_TYPE"]
        ```

    - schemaFileName, outputDBMLFileName, outputXlsxFileName 可客製化輸入輸出檔案的名稱
    - titleXXX 可以客製化 schema.xlsx 的標題文字


## DBDOCS 

如果要使用dbdocs，可以續繼閱讀 [README2-DBDOCS說明.md](./README2-DBDOCS說明.md)



