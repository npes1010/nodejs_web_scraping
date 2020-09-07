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
let bigarrLink = [];

async function search(){
    await nightmare
    .goto('https://www.bookwormzz.com/zh/', headers)
    .wait(4000)
    .catch((err) => {
        throw err;
    });
    await scrollPage;
}

async function parseHtml(){
    let html = await nightmare.evaluate(() => {
        return document.documentElement.innerHTML;
    });
    let obj = {};

    $(html).find('ul.ui-listview.ui-listview-inset.ui-corner-all.ui-shadow li')
    .each(function(index, element){
        $(element).find('a').each(function(idx, elm){
            let aLink = $(elm).attr('href');
            arrLink.push('https://www.bookwormzz.com/' + aLink.replace('../', ''));
        });
    });
}

async function getchapterInfo(){
    for(let i = 0; i < 46; i++){
        let html = await nightmare
        .goto(arrLink[i])
        .wait(3000)
        .click('a#toc_list')
        .wait(3000)
        .evaluate(() => {
            return document.documentElement.innerHTML;
        });
        
        $(html)
        .find('div.ui-content li')
        .each(function(index, element){
            $(element).find('a').each(function(idx, elm){
                let obj = {};
                let aLink = $(elm).attr('href');
                let chapter_name = $(elm).text();
                obj.link = 'https://www.bookwormzz.com' + aLink; 
                obj.chapter_name = chapter_name;
                obj.article = {};
                bigarrLink.push(obj);
            });
        });
        console.log("bigarrLink=",arrLink[i],"i=",i);
        await writeFile(`downloads/homework_chapter.json`, JSON.stringify(bigarrLink, null, 4));
    }
}


async function getDetailInfo(){
    let strJson = await fs.readFileSync('downloads/homework_chapter.json', { encoding: 'utf-8' });
    let arr = JSON.parse(strJson);

    for(let i = 0; i < arr.length; i++){
        let html = await nightmare
        .goto(arr[i].link)
        .wait(20000)
        .evaluate(() => {
            return document.documentElement.innerHTML;
        });
        let article = $(html)
        .find('div[style="height: auto !important;"]')
        .text().trim();
        let bookname = $(html)
        .find('h1.title.ui-title')
        .text().trim().replace('線上小說閱讀', '');
        bigarrLink[i].article = article; 
        bigarrLink[i].bookname = bookname;
    }
}

async function newgetDetailInfo(){
    let strJson = await fs.readFileSync('downloads/homework_chapter.json', { encoding: 'utf-8' });
    let arr = JSON.parse(strJson);

    for(let i = 0; i < arr.length; i++){
        await nightmare
        .goto(arr[i].link)
        .catch((err) => {
            console.error(err);
        });
        console.log(`準備滾動頁面`);

        let currentHeight = 0; 
        let offset = 0; 
        while(offset <= currentHeight){
            currentHeight = await nightmare.evaluate(()=>{
                return document.documentElement.scrollHeight; 
            });
            offset += 2000;
            await nightmare.scrollTo(offset, 0).wait(500);
        }
        let html = await nightmare.evaluate(() => {
            return document.documentElement.innerHTML;
        });
        let article = $(html)
        .find('div[style="height: auto !important;"]')
        .text().trim();
        let bookname = $(html)
        .find('h1.title.ui-title')
        .text().trim().replace('線上小說閱讀', '');
        bigarrLink[i].article = article; 
        bigarrLink[i].bookname = bookname;
    }
}

async function scrollPage(){
    console.log('滾動頁面，將動態資料逐一顯示出來');
    let currentHeight = 0;
    let offset = 0;
    while(offset <= currentHeight){
        currentHeight = await nightmare.evaluate(() => {
            return document.documentElement.scrollHeight;
        });
        offset += 300;
        await nightmare.scrollTo(offset, 0).wait(500);;
    }
}

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
        parseHtml,
        getchapterInfo,
        newgetDetailInfo,
        close
    ]).then(async () =>{
        console.dir(bigarrLink, {depth: null});

        for(let i = 0; i < bigarrLink.length; i++){
            await writeFile(`downloads/hw/${bigarrLink[i].bookname} ${bigarrLink[i].chapter_name}.txt`, bigarrLink[i].article);
            console.log(i);
        }
        await writeFile(`downloads/homework_chapter.json`, JSON.stringify(bigarrLink, null, 4));
        await writeFile(`downloads/homework_bookname.json`, JSON.stringify(arrLink, null, 4));
        console.log('Done');
    });
} catch (err){
    throw err;
}

