## Install dbdocs CLI

dbdocs CLI 的功能為將dbml的檔案上傳到 [dbdiagram.io](https://dbdiagram.io/d) 產生靜態頁面

```bash
npm install -g dbdocs
```

## 註冊

用 gmail 註冊 [dbdiagram.io](https://dbdiagram.io/d) 以便後續使用 dbdocs 時進行登入

## Install VSCode Plugin

主要是做 dbml 語法的 syntax highlighting，不裝也沒關係

https://marketplace.visualstudio.com/items?itemName=matt-meyers.vscode-dbml

## 創建dbml檔案

創建 [schema.dbml](./outputFiles/schema.dbml)

```dbml
Project TEST{
    database_type: 'Oracle'
    Note: '''
        # TEST Schedule Database
    '''
}

Table COURSE [note: '課程'] {
	COURSE_ID         NUMBER(20)         [pk, not null, note: '主檔流水號']
	COURSE_NAME       VARCHAR2 (16 CHAR) [not null, note: '課程名稱']
	COURSE_TYPE_ID    NUMBER(20)         [not null, note: '關聯到：課程類型', ref: > COURSE_TYPE.COURSE_TYPE_ID]
	CREATE_TIME       DATE               [not null, note: '建立時間']
}

Table COURSE_TYPE [note: '課程類型'] {
	COURSE_TYPE_ID    NUMBER(20)         [pk, not null, note: '主檔流水號']
	COURSE_TYPE_NAME  VARCHAR2 (16 CHAR) [not null, note: '課程類型名稱']
	CREATE_TIME       DATE               [not null, note: '建立時間']
}

Table STUDENT [note: '學生'] {
	STUDENT_ID        NUMBER(20)         [pk, not null, note: '主檔流水號']
	STUDENT_NAME      VARCHAR2 (16 CHAR) [not null, note: '學生姓名']
	CREATE_TIME       DATE               [not null, note: '建立時間']
}

Table COURSE_STUDENT [note: '課程學生'] {
	COURSE_STUDENT_ID NUMBER(20)         [pk, not null, note: '主檔流水號']
	COURSE_ID         NUMBER(20)         [not null, note: '課程ID', ref: > COURSE.COURSE_ID]
	STUDENT_ID        NUMBER(20)         [not null, note: '學生ID', ref: > STUDENT.STUDENT_ID]
	CREATE_TIME       DATE               [not null, note: '建立時間']
}
```


### 登入

```bash
dbdocs login
```

- 選擇email登入
- 輸入email帳號
- 從信箱收取OTP密碼，並進行輸入

### build，產生靜態網頁結果

```bash
dbdocs build ./outputFiles/schema.dbml
```

### 搭配密碼

```bash
dbdocs password --set yourpassword --project TEST
```

### 列出自己的帳號下有多少project

```bash
# check project list
dbdocs ls
```

### 刪除特定project

```bash
# remove Example project
dbdocs remove TEST
```


### dbml2sql

```bash
# 查看指令
dbml2sql --help

# 將db.dbml轉換為Postgresql的SQL語法
dbml2sql --postgres -o schema.sql schema.dbml
```