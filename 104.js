const Nightmare = require('nightmare');
const nightmare = Nightmare({ show: true, width: 1280, height: 1024 });
const util = require('util');
const fs = require('fs');

const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const { window } = new JSDOM();
const $ = require('jquery')(window);

const writeFile = util.promisify(fs.writeFile);

const headers = {
    'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36',
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
    'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
};

let arrLink = [];

let strKeyword = 'node.js';

async function search(){
    console.log('進行檢索(搜尋職缺名稱)');

    await nightmare
    .goto('https://www.104.com.tw', headers)
    .type('input#ikeyword', strKeyword) //輸入關鍵字
    .wait(2000) 
    .click('span#icity') //按下「地區」
    .wait(2000) 
    .click('div.second-floor-rect input[value="6001001000"]') //選擇台北市
    .wait(2000)
    .click('div.second-floor-rect input[value="6001002000"]') //選擇新北市
    .wait(2000)
    .click('button.category-picker-btn-primary')
    .wait(2000)
    .click('button.btn.btn-primary.js-formCheck')
    .catch((err) => {
        throw err;
    });
}

//選擇全職、兼職等選項
async function setJobType(){
    console.log('選擇全職、兼職等選項');

    await nightmare
    .wait(2000)
    .click('ul#js-job-tab > li[data-value="1"]'); //點選全職
}

async function scrollPage(){
    console.log('滾動頁面，將動態資料逐一顯示出來');

    let currentHeight = 0;
    let offset = 0;

    while(offset <= currentHeight){
        currentHeight = await nightmare.evaluate(() => {
            return document.documentElement.scrollHeight;
        });
        offset += 500;
        await nightmare.scrollTo(offset, 0).wait(500);

        console.log(`offset = ${offset}, currentHeight = ${currentHeight}`);

        if( offset > 300 ){
            break;
        }

        if( (currentHeight - offset) < 2000 && await nightmare.exists('button.b-btn.b-btn--link.js-more-page')){
            await _checkPagination();
        }
    }
}

//按「下一頁」
async function _checkPagination(){
    await nightmare
    .wait('button.b-btn.b-btn--link.js-more-page')
    .click('button.b-btn.b-btn--link.js-more-page');
}

async function parseHtml(){
    console.log('分析、整理、收集重要資訊');

    //取得滾動後，得到動態產生結果的 html 元素
    let html = await nightmare.evaluate(() => {
        return document.documentElement.innerHTML;
    });

    let obj = {};

    $(html)
    .find('div#js-job-content article')
    .each((index, element) => {
        let elm = $(element).find('div.b-block__left');

        let position = elm.find('h2.b-tit a.js-job-link').text(); //職缺名稱
        let positionLink = 'https:' + elm.find('h2.b-tit a.js-job-link').attr('href');
        let location = elm.find('ul.b-list-inline.b-clearfix.job-list-intro.b-content li:eq(0)').text();
        let companyName = elm.find('ul.b-list-inline.b-clearfix li a').text().trim();
        let companyLink = 'https:' + elm.find('ul.b-list-inline.b-clearfix li a').attr('href');
        let category = elm.find('ul.b-list-inline.b-clearfix li:eq(2)').text();
        console.log(companyLink);
        obj.keyword = strKeyword;
        obj.position = position;
        obj.positionLink = positionLink;
        obj.location = location;
        obj.companyName = companyName;
        obj.companyLink = companyLink;
        obj.category = category;

        arrLink.push(obj);

        obj = {};
    });
}

async function getDetailInfo(){
    for(let i = 0; i < arrLink.length; i++){

        let html = await nightmare
        .goto(arrLink[i].positionLink)
        .wait('div.job-description-table.row div.row.mb-2')
        .evaluate(() => {
            return document.documentElement.innerHTML;
        });

        //取得上班地點
        let positionPlace = $(html)
        .find('div.job-description-table.row div.row.mb-2:eq(3) p.t3.mb-0')
        .text().trim();

        //取得職務類別
        let positionCategory = $(html)
        .find('div.job-description-table.row div.row.mb-2:eq(0) div.col.p-0.job-description-table__data')
        .text().trim();

        //新增屬性
        arrLink[i].positionPlace = positionPlace;
        arrLink[i].positionCategory = positionCategory;
    }
}

//關閉 nightmare
async function close(){
    await nightmare.end(() => {
        console.log(`關閉 nightmare`);
    });
}

async function asyncArray(functionList){
    for(let func of functionList){
        await func();
    }
}

try {
    asyncArray([
        search, 
        setJobType, 
        scrollPage, 
        parseHtml,
        getDetailInfo,
        close
    ]).then(async () =>{
        console.dir(arrLink, {depth: null});
        
        await writeFile(`downloads/104.json`, JSON.stringify(arrLink, null, 4));

        console.log('Done');
    });
} catch (err){
    throw err;
}

