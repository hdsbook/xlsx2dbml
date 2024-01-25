const path = require('path');
const { exec } = require('child_process');

const fs = require('fs');
const inquirer = require('inquirer');

// 執行指令相關 ----------------------
const OpenExcel = function (filePath, excelPath) {

    if (excelPath) {
        console.log(`\n將為您開啟檔案: ${filePath}`);

        const command = `"${excelPath}" "${path.resolve(filePath)}"`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`開啟檔案失敗: ${error.message}`);
                return;
            }
        });
    }
}

const CheckGlobalInstallation = (pluginName, callback) => {
    exec(`npm list -g ${pluginName}`, (error, stdout, stderr) => {
        const isInstalled = stdout.includes(pluginName);
        callback(isInstalled);
    });
};


const Exececute = (command, callback) => {
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error running command (${command}): ${error.message}`);
            callback(false);
            return;
        }

        if (stderr) {
            console.error(`${stderr}`);
        }
        console.log(stdout);

        callback(true);
    });
}


// 互動相關 ----------------------

const ChooseConfig = (configFiles) => {
    const questions = [
        {
            type: 'list',
            name: 'configFileName',
            message: '請選擇要使用的設定檔:',
            choices: configFiles
        },
    ];

    return inquirer.prompt(questions).then(answers => answers.configFileName);
}

const ChooseDbdocsCommand = (dbmlPath, dbmlProjectName) => {
    const questions = [
        {
            type: 'list',
            name: 'command',
            message: '請選擇動作:',
            choices: [
                `dbdocs build ${dbmlPath}`,
                `exit`,
                `dbdocs password --set [pwd] --project ${dbmlProjectName}`,
                `dbdocs ls`,
                `dbdocs remove ${dbmlProjectName}`,
            ],
        },
        {
            type: 'password',
            name: 'password',
            message: '请输入密码:',
            mask: '*',
            when: (answers) => answers.command.indexOf('password') !== -1,
        },
    ];

    return inquirer.prompt(questions)
        .then(function (answers) {
            if (answers.command != 'exit') {
                if (answers.password) {
                    answers.command = answers.command.replace('[pwd]', answers.password);
                }
                Exececute(answers.command, function (success) {
                    if (success) {
                        ChooseDbdocsCommand(dbmlPath, dbmlProjectName); // 成功執行後，再度詢問
                    }
                });
            }
        })
}

module.exports = {
    OpenExcel,
    CheckGlobalInstallation,
    Exececute,
    
    ChooseConfig,
    ChooseDbdocsCommand
}