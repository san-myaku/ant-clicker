'use strict';
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const executablePath=process.env.CHROME_PATH;
if(executablePath&&!fs.existsSync(executablePath))throw Error('CHROME_PATH does not exist: '+executablePath);
module.exports={chromium,launchOptions:{headless:true,...(executablePath?{executablePath}:{})}};
